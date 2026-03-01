<template>
  <q-page class="q-pa-md" style="max-width: 680px; margin: 0 auto;">

    <div class="text-h5 text-weight-bold q-mb-md">Account Settings</div>

    <q-tabs
      v-model="activeTab"
      align="left"
      dense
      indicator-color="primary"
      active-color="primary"
      class="q-mb-md"
    >
      <q-tab name="account"  icon="person" label="Account"  />
      <q-tab name="address"  icon="home"   label="Address"  />
      <q-tab name="skills"   icon="build"  label="Skills"   />
      <q-tab name="security" icon="lock"   label="Security" />
    </q-tabs>

    <q-separator class="q-mb-lg" />

    <q-tab-panels v-model="activeTab" animated keep-alive>
      <q-tab-panel name="account"  class="q-pa-none"><Account  /></q-tab-panel>
      <q-tab-panel name="address"  class="q-pa-none"><Address  /></q-tab-panel>
      <q-tab-panel name="skills"   class="q-pa-none"><Skills   /></q-tab-panel>
      <q-tab-panel name="security" class="q-pa-none"><Security /></q-tab-panel>
    </q-tab-panels>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import Account  from '../components/user/settings/Account.vue'
import Address  from '../components/user/settings/Address.vue'
import Skills   from '../components/user/settings/Skills.vue'
import Security from '../components/user/settings/Security.vue'

const activeTab = ref('account')
</script>
