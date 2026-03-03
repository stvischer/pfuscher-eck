<template>
  <div class="q-pa-md" style="max-width: 680px; margin: 0 auto">

    <!-- Title -->
    <q-input
      v-model="form.title"
      label="Title *"
      outlined dense
      class="q-mb-sm"
      :error="!!errors.title"
      :error-message="errors.title"
    />

    <!-- Category -->
    <q-select
      v-model="form.category"
      label="Category"
      :options="app.skills"
      option-label="name"
      option-value="name"
      emit-value
      outlined dense clearable
      class="q-mb-sm"
    />

    <!-- Description -->
    <q-input
      v-model="form.description"
      label="Description *"
      type="textarea"
      outlined dense
      autogrow
      class="q-mb-sm"
      :error="!!errors.description"
      :error-message="errors.description"
    />

    <q-separator class="q-mb-md" />

    <!-- Location -->
    <AddressSelector v-model="addressData" hide-title />

    <q-separator class="q-mb-md" />

    <!-- Skills -->
    <div class="text-subtitle2 text-weight-medium q-mb-sm">
      <q-icon name="handyman" class="q-mr-xs" />Skills needed
    </div>
    <SkillsSelector ref="skillsRef" :key="skillsKey" :model-value="[]" :root-id="selectedCategoryId" />

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../../composables/useApi.js'
import { useAuthStore } from '../../stores/auth.js'
import { useAppStore } from '../../stores/app.js'
import AddressSelector from '../shared/Address.vue'
import SkillsSelector from '../shared/Skills.vue'

const emit = defineEmits(['submitted', 'cancel'])

const $q   = useQuasar()
const auth = useAuthStore()
const app  = useAppStore()

function userHomeAddress() {
  const home = auth.user?.addresses?.find(a => a.addressType === 'home') ?? auth.user?.addresses?.[0] ?? {}
  return { ...home }
}

const addressData = ref(userHomeAddress())

// Keep addressData in sync whenever the user's saved addresses load/change
watch(() => auth.user?.addresses, () => {
  addressData.value = userHomeAddress()
}, { deep: true, immediate: true })

// ── Constants ─────────────────────────────────────────────────────────────────
// (root skills used as categories — loaded from app store)

// ── Form state ────────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    title:       '',
    description: '',
    category:    null,
  }
}

const form   = reactive(emptyForm())
const errors = reactive({ title: '', description: '' })

const submitting = ref(false)
const skillsRef  = ref(null)
const skillsKey  = ref(0)

// Resolve the selected category name to its root skill id so the tree filters
const selectedCategoryId = computed(() =>
  app.skills.find(s => s.name === form.category)?.id ?? null,
)

// Re-key (and clear) the skills tree whenever the category changes
watch(selectedCategoryId, () => { skillsKey.value++ })

// ── Validation ────────────────────────────────────────────────────────────────

function validate() {
  errors.title = ''
  errors.description = ''
  let ok = true
  if (!form.title || form.title.length < 3) {
    errors.title = 'Title is required (min 3 characters)'
    ok = false
  }
  if (!form.description || form.description.length < 10) {
    errors.description = 'Description is required (min 10 characters)'
    ok = false
  }
  return ok
}

// ── Public API ────────────────────────────────────────────────────────────────

function reset() {
  Object.assign(form, emptyForm())
  errors.title = ''
  errors.description = ''
  addressData.value = userHomeAddress()
  skillsKey.value++  // force SkillsSelector to remount empty
}

async function submit() {
  if (!validate()) return

  submitting.value = true
  try {
    const addr = addressData.value
    const created = await api.post('/repairs', {
      title:       form.title,
      description: form.description,
      category:    form.category    ?? undefined,
      street:      addr.street      || undefined,
      city:        addr.city        || undefined,
      state:       addr.state       || undefined,
      postalCode:  addr.postalCode  || undefined,
      country:     addr.country     || undefined,
      lat:         addr.lat         ?? undefined,
      lon:         addr.lon         ?? undefined,
      skillIds:    skillsRef.value?.getFields().skills.map(s => s.skillId) ?? [],
    })

    $q.notify({ type: 'positive', message: 'Request posted!', position: 'top' })
    reset()
    emit('submitted', created)
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Submit failed', position: 'top' })
  } finally {
    submitting.value = false
  }
}

defineExpose({ submit, reset, submitting })
</script>
