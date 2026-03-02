<template>
  <q-dialog :model-value="true" persistent transition-show="fade" transition-hide="fade">
    <q-card style="width: 360px; max-width: 95vw">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Sign in</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="goHome" />
      </q-card-section>

      <q-card-section>
        <q-banner v-if="auth.error" class="bg-negative text-white q-mb-md" rounded>
          {{ auth.error }}
        </q-banner>

        <q-form @submit.prevent="submit">
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
            autocomplete="current-password"
            :rules="[val => !!val || 'Required']"
            class="q-mb-sm"
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

          <q-checkbox
            v-model="remember"
            label="Remember me"
            class="q-mb-md"
            dense
          />

          <q-btn
            type="submit"
            label="Login"
            color="primary"
            class="full-width"
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <span class="text-caption">No account yet? </span>
        <a class="text-primary cursor-pointer" @click="showRegister = true">Register</a>
      </q-card-section>
    </q-card>
  </q-dialog>

  <RegisterDialog v-model="showRegister" />
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import RegisterDialog from '../components/RegisterDialog.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email        = ref('')
const password     = ref('')
const showPw       = ref(false)
const remember     = ref(false)
const showRegister = ref(false)

function goHome() {
  router.push('/')
}

async function submit() {
  auth.clearError()
  try {
    await auth.login(email.value, password.value, remember.value)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch {
    // error shown via auth.error
  }
}
</script>
