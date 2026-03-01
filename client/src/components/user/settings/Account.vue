<template>
  <q-card flat bordered>
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
        </div>

        <div class="row justify-end q-pt-xs">
          <q-btn type="submit" label="Save" color="primary" unelevated :loading="saving" />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../../../stores/auth.js'

const $q   = useQuasar()
const auth = useAuthStore()

const form = reactive({
  username:    auth.user?.username    ?? '',
  displayName: auth.user?.displayName ?? '',
  email:       auth.user?.email       ?? '',
  phone:       auth.user?.phone       ?? '',
  bio:         auth.user?.bio         ?? '',
})

const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await auth.updateProfile({
      username:    form.username,
      displayName: form.displayName,
      email:       form.email,
      phone:       form.phone,
      bio:         form.bio,
    })
    $q.notify({ type: 'positive', message: 'Saved', position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Save failed', position: 'top' })
  } finally {
    saving.value = false
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>
