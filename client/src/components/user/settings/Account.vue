<template>
  <q-card flat>
    <q-card-section>
      <div class="text-subtitle1 text-weight-medium q-mb-xs">Account info</div>
      <div class="text-caption text-grey q-mb-md">Your login credentials and public display name.</div>

      <q-form @submit.prevent="save" class="q-gutter-y-sm">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.username"
              label="Username"
              outlined dense
              :rules="[v => (v && v.length >= 3) || 'Min 3 characters']"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.displayName"
              label="Display name"
              outlined dense
              hint="Shown instead of username when set"
            />
          </div>
        </div>

        <q-input
          v-model="form.email"
          label="Email"
          type="email"
          outlined dense
          :rules="[v => /.+@.+\..+/.test(v) || 'Enter a valid email']"
        />

        <q-input
          v-model="form.phone"
          label="Phone"
          outlined dense
          hint="Optional"
        />

        <q-input
          v-model="form.bio"
          label="Bio"
          type="textarea"
          outlined dense
          autogrow
          maxlength="1000"
          counter
          hint="A short description about yourself"
        />

        <div class="row items-center q-mt-xs">
          <q-chip dense :label="auth.user?.role" color="primary" text-color="white" icon="shield" class="q-mr-sm" />
          <span v-if="auth.user?.createdAt" class="text-caption text-grey">
            Member since {{ formatDate(auth.user.createdAt) }}
          </span>
          <q-space />
          <q-btn flat dense no-caps type="button" label="Change password" color="primary" @click="passwordDialog = true" />
        </div>

      </q-form>
    </q-card-section>
  </q-card>

  <!-- ── Change password dialog ──────────────────────────────────── -->
  <q-dialog v-model="passwordDialog" persistent>
    <q-card v-if="passwordDialog" style="min-width:340px">
      <q-card-section>
        <div class="text-h6">Change password</div>
        <div class="text-caption text-grey">Choose a strong password of at least 8 characters.</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-form ref="pwFormRef" @submit.prevent="savePw" class="q-gutter-y-sm" autocomplete="off">
          <q-input
            v-model="pw.current"
            label="Current password"
            :type="showCurrent ? 'text' : 'password'"
            :name="pwNonce + 'a'"
            autocomplete="new-password"
            :input-attrs="pwReady ? {} : { readonly: '' }"
            @focus="pwReady = true"
            outlined dense autofocus
            :rules="[v => !!v || 'Required']"
          >
            <template #append>
              <q-icon :name="showCurrent ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showCurrent = !showCurrent" />
            </template>
          </q-input>

          <q-input
            v-model="pw.next"
            label="New password"
            :type="showNext ? 'text' : 'password'"
            :name="pwNonce + 'b'"
            autocomplete="new-password"
            :input-attrs="pwReady ? {} : { readonly: '' }"
            @focus="pwReady = true"
            outlined dense
            :rules="[v => (v && v.length >= 8) || 'Min 8 characters']"
          >
            <template #append>
              <q-icon :name="showNext ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showNext = !showNext" />
            </template>
          </q-input>
          <PasswordStrength :password="pw.next" />

          <q-input
            v-model="pw.confirm"
            label="Confirm new password"
            :type="showNext ? 'text' : 'password'"
            :name="pwNonce + 'c'"
            autocomplete="new-password"
            :input-attrs="pwReady ? {} : { readonly: '' }"
            @focus="pwReady = true"
            outlined dense
            :rules="[v => v === pw.next || 'Passwords do not match']"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="closePasswordDialog" />
        <q-btn unelevated color="primary" label="Update password" :loading="pwSaving" @click="savePw" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../../../stores/auth.js'
import PasswordStrength from '../../shared/PasswordStrength.vue'

const $q  = useQuasar()
const auth = useAuthStore()

// ── Profile ───────────────────────────────────────────────────────────────

const form = reactive({
  username:    auth.user?.username    ?? '',
  displayName: auth.user?.displayName ?? '',
  email:       auth.user?.email       ?? '',
  phone:       auth.user?.phone       ?? '',
  bio:         auth.user?.bio         ?? '',
})

function _formSnap() {
  return JSON.stringify({ username: form.username, displayName: form.displayName, email: form.email, phone: form.phone, bio: form.bio })
}
const snapshot = ref(_formSnap())
const isDirty  = computed(() => _formSnap() !== snapshot.value)

function getFields() {
  return {
    username:    form.username,
    displayName: form.displayName,
    email:       form.email,
    phone:       form.phone,
    bio:         form.bio,
  }
}

function resetSnapshot() {
  snapshot.value = _formSnap()
}

defineExpose({ getFields, resetSnapshot, isDirty })

// ── Change password dialog ────────────────────────────────────────────────

const passwordDialog = ref(false)
const pwNonce        = ref(Math.random().toString(36).slice(2))
const pwFormRef      = ref()
const pwReady        = ref(false)

watch(passwordDialog, (open) => {
  if (open)  { pwNonce.value = Math.random().toString(36).slice(2); pwReady.value = false }
})
const pw             = reactive({ current: '', next: '', confirm: '' })
const pwSaving       = ref(false)
const showCurrent    = ref(false)
const showNext       = ref(false)

function closePasswordDialog() {
  passwordDialog.value = false
  pw.current = ''
  pw.next    = ''
  pw.confirm = ''
  showCurrent.value = false
  showNext.value    = false
}

async function savePw() {
  const valid = await pwFormRef.value?.validate()
  if (!valid) return
  pwSaving.value = true
  try {
    await auth.changePassword(pw.current, pw.next)
    $q.notify({ type: 'positive', message: 'Password updated', position: 'top' })
    closePasswordDialog()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Failed to update password', position: 'top' })
  } finally {
    pwSaving.value = false
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>
