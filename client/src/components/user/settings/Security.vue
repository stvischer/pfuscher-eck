<template>
  <q-card flat>
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

      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useAuthStore } from '../../../stores/auth.js'

const auth = useAuthStore()

const form        = reactive({ current: '', next: '', confirm: '' })
const saving      = ref(false)
const showCurrent = ref(false)
const showNext    = ref(false)

async function save() {
  // skip silently if password fields are untouched
  if (!form.current && !form.next && !form.confirm) return
  if (form.next !== form.confirm) throw new Error('Passwords do not match')
  if (!form.current) throw new Error('Current password is required')
  saving.value = true
  try {
    await auth.changePassword(form.current, form.next)
    form.current = ''
    form.next    = ''
    form.confirm = ''
  } catch (err) {
    throw err
  } finally {
    saving.value = false
  }
}

defineExpose({ save })
</script>
