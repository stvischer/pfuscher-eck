<template>
  <q-page class="flex flex-center">
    <q-card style="width: 400px">
      <q-card-section>
        <div class="text-h6">Welcome, {{ auth.user?.username }}!</div>
        <div class="text-caption text-grey">{{ auth.user?.email }} · {{ auth.user?.role }}</div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Logout" color="negative" @click="logout" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>
