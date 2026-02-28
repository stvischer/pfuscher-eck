<template>
  <q-dialog :model-value="true" persistent transition-show="fade" transition-hide="fade">
    <q-card style="width: 360px; max-width: 95vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Create account</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="router.push('/')" />
      </q-card-section>

      <q-card-section>
        <q-banner v-if="auth.error" class="bg-negative text-white q-mb-md" rounded>
          {{ auth.error }}
        </q-banner>

        <q-form @submit.prevent="submit">
          <q-input
            v-model="username"
            label="Username"
            autocomplete="username"
            :rules="[val => !!val || 'Required', val => val.length >= 3 || 'Min 3 characters']"
            class="q-mb-sm"
            outlined
            dense
          />
          <q-input
            v-model="email"
            label="Email"
            type="email"
            autocomplete="email"
            :rules="[val => !!val || 'Required']"
            class="q-mb-sm"
            outlined
            dense
          />
          <q-input
            v-model="password"
            label="Password"
            :type="showPw ? 'text' : 'password'"
            autocomplete="new-password"
            :rules="[val => !!val || 'Required', val => val.length >= 8 || 'Min 8 characters']"
            class="q-mb-md"
            outlined
            dense
          >
            <template #append>
              <q-icon
                :name="showPw ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPw = !showPw"
              />
            </template>
          </q-input>

          <q-btn
            type="submit"
            label="Register"
            color="primary"
            class="full-width"
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <span class="text-caption">Already have an account? </span>
        <router-link :to="{ name: 'login' }" class="text-primary">Login</router-link>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const email    = ref('')
const password = ref('')
const showPw   = ref(false)

async function submit() {
  auth.clearError()
  try {
    await auth.register(username.value, email.value, password.value)
    router.push({ name: 'home' })
  } catch {
    // error shown via auth.error
  }
}
</script>
