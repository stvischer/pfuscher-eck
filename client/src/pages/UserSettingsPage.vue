<template>
  <q-page class="q-pa-md settings-page">
    <div class="text-h5 text-weight-bold q-mb-lg">Account Settings</div>
    <div style="max-width:680px;margin:0 auto">
      <Account  ref="accountRef"  />
      <q-separator />
      <Address  ref="addressRef"  />
      <q-separator />
      <Skills   ref="skillsRef"   />

      <div class="row justify-end q-pt-lg">
        <q-btn
          label="Save"
          color="primary"
          unelevated
          :loading="saving"
          :disable="!hasChanges"
          @click="saveAll"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth.js'
import Account  from '../components/user/settings/Account.vue'
import Address  from '../components/user/settings/Address.vue'
import Skills   from '../components/user/settings/Skills.vue'

const $q   = useQuasar()
const auth = useAuthStore()

const accountRef  = ref()
const addressRef  = ref()
const skillsRef   = ref()
const saving      = ref(false)

const hasChanges = computed(() =>
  !!(accountRef.value?.isDirty || addressRef.value?.isDirty || skillsRef.value?.isDirty)
)

async function saveAll() {
  saving.value = true
  try {
    const profileDirty = !!(accountRef.value?.isDirty || skillsRef.value?.isDirty)
    const addressDirty = !!addressRef.value?.isDirty

    if (profileDirty) {
      const profileFields = {
        ...accountRef.value?.getFields(),
        ...skillsRef.value?.getFields(),
      }
      await auth.updateProfile(profileFields)
      accountRef.value?.resetSnapshot()
      skillsRef.value?.resetSnapshot()
    }

    if (addressDirty) {
      await auth.upsertAddress(addressRef.value.getFields())
      addressRef.value?.resetSnapshot()
    }

    $q.notify({ type: 'positive', message: 'Settings saved', position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Save failed', position: 'top' })
  } finally {
    saving.value = false
  }
}
</script>
