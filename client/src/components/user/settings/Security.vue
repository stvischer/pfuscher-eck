<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-subtitle1 text-weight-medium q-mb-xs">Change Password</div>
      <div class="text-caption text-grey q-mb-md">Choose a strong password of at least 8 characters.</div>

      <q-form @submit.prevent="save" class="q-gutter-y-sm">
        <q-input
          v-model="form.current"
          label="Current password"
          :type="showCurrent ? 'text' : 'password'"
          outlined dense
          :rules="[v => !!v || 'Required']"
        >
          <template #append>
            <q-icon
              :name="showCurrent ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showCurrent = !showCurrent"
            />
          </template>
        </q-input>

        <q-input
          v-model="form.next"
          label="New password"
          :type="showNext ? 'text' : 'password'"
          outlined dense
          :rules="[v => (v && v.length >= 8) || 'Min 8 characters']"
        >
          <template #append>
            <q-icon
              :name="showNext ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showNext = !showNext"
            />
          </template>
        </q-input>

        <q-input
          v-model="form.confirm"
          label="Confirm new password"
          :type="showNext ? 'text' : 'password'"
          outlined dense
          :rules="[v => v === form.next || 'Passwords do not match']"
        />

        <div class="row justify-end q-pt-xs">
          <q-btn
            type="submit"
            label="Update password"
            color="primary"
            unelevated
            :loading="saving"
            :disable="!form.current || !form.next || !form.confirm"
          />
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

const form        = reactive({ current: '', next: '', confirm: '' })
const saving      = ref(false)
const showCurrent = ref(false)
const showNext    = ref(false)

async function save() {
  if (form.next !== form.confirm) return
  saving.value = true
  try {
    await auth.changePassword(form.current, form.next)
    $q.notify({ type: 'positive', message: 'Password updated', position: 'top' })
    form.current = ''
    form.next    = ''
    form.confirm = ''
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Failed to update password', position: 'top' })
  } finally {
    saving.value = false
  }
}
</script>
