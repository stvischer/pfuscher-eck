<template>
  <q-layout view="hHh lpR fFf">

    <!-- ── Header ─────────────────────────────────────────────────── -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold">
          Pfuscher Eck
        </q-toolbar-title>

        <template v-if="auth.isAuthenticated">
          <q-btn-dropdown flat no-caps :label="auth.user?.username ?? ''" icon="person">
            <q-list>
              <q-item dense class="q-pa-sm">
                <q-item-section>
                  <q-item-label caption>{{ auth.user?.email }}</q-item-label>
                  <q-item-label caption class="text-uppercase text-primary">
                    {{ auth.user?.role }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item v-close-popup clickable @click="logout">
                <q-item-section avatar>
                  <q-icon name="logout" color="negative" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-negative">Logout</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </template>

        <template v-else>
          <q-btn flat no-caps icon="login" label="Login" :to="{ name: 'login' }" />
        </template>
      </q-toolbar>
    </q-header>

    <!-- ── Right Drawer (desktop) ─────────────────────────────────── -->
    <q-drawer
      v-model="drawerOpen"
      side="right"
      show-if-above
      :width="200"
      :breakpoint="768"
      bordered
    >
      <q-scroll-area class="fit">
        <q-list padding>
          <q-item
            v-for="link in navLinks"
            :key="link.name"
            :to="{ name: link.name }"
            exact
            active-class="nav-active"
            clickable
            v-ripple
            class="rounded-borders q-mb-xs"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>{{ link.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- ── Bottom Navigation (mobile) ────────────────────────────── -->
    <q-footer v-if="$q.screen.lt.md" bordered>
      <q-tabs align="justify" active-color="primary" indicator-color="primary">
        <q-route-tab
          v-for="link in navLinks"
          :key="link.name"
          :icon="link.icon"
          :label="undefined"
          :to="{ name: link.name }"
          exact
        />
      </q-tabs>
    </q-footer>

    <!-- ── Page Container ─────────────────────────────────────────── -->
    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from './stores/auth.js'

const $q     = useQuasar()
const auth   = useAuthStore()
const router = useRouter()

const drawerOpen = ref(false)

const navLinks = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'chat', label: 'Chat', icon: 'chat' },
]

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<style>
body {
  background: #1a1a2e;
}

.nav-active {
  color: var(--q-primary);
  background: rgba(var(--q-primary-rgb), 0.12);
  font-weight: 600;
}
</style>
