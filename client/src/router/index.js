import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../pages/ChatPage.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/RegisterPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/UserSettingsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Try to rehydrate session on first navigation
  if (auth.user === null && !sessionStorage.getItem('auth_checked')) {
    sessionStorage.setItem('auth_checked', '1')
    await auth.fetchMe()
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
})

export default router
