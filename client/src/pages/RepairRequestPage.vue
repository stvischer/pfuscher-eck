<template>
  <q-page class="repairs-page">

    <!-- ── Toolbar / Filter bar ─────────────────────────────────────────── -->
    <div class="repairs-toolbar q-pa-md row items-center q-col-gutter-sm">
      <div class="col-12 col-sm-5 col-md-4">
        <q-input
          v-model="filterText"
          outlined dense clearable
          placeholder="Search requests…"
          bg-color="white"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-6 col-sm-3 col-md-2">
        <q-select
          v-model="filterCategory"
          :options="[null, ...CATEGORIES]"
          :display-value="filterCategory ?? 'All categories'"
          outlined dense
          bg-color="white"
          emit-value
        />
      </div>
      <div class="col-6 col-sm-3 col-md-2">
        <q-select
          v-model="filterUrgency"
          :options="[{ label: 'All urgencies', value: null }, ...URGENCY_OPTIONS]"
          option-label="label"
          option-value="value"
          emit-value map-options
          outlined dense
          bg-color="white"
        />
      </div>
      <div class="col-12 col-sm-auto text-caption text-grey q-pl-xs">
        {{ filteredRequests.length }} request{{ filteredRequests.length === 1 ? '' : 's' }}
      </div>
    </div>

    <!-- ── List ─────────────────────────────────────────────────────────── -->
    <div class="q-px-md q-pb-xl">

      <div v-if="loading" class="text-center q-pa-xl">
        <q-spinner color="primary" size="lg" />
      </div>

      <div v-else-if="filteredRequests.length === 0" class="text-center text-grey q-pa-xl">
        <q-icon name="build_circle" size="5rem" color="grey-5" />
        <div class="q-mt-md text-body1">No repair requests found.</div>
        <div v-if="auth.isAuthenticated" class="q-mt-xs text-caption">
          Be the first — click the + button to post one.
        </div>
      </div>

      <div v-else class="repairs-grid">
        <q-card
          v-for="req in filteredRequests"
          :key="req.id"
          flat bordered
          class="repair-card"
        >
          <!-- Header: title + urgency badge + date -->
          <q-card-section class="q-pb-xs">
            <div class="row items-start no-wrap">
              <div class="col">
                <div class="text-subtitle1 text-weight-bold">{{ req.title }}</div>
                <div class="text-caption text-grey">
                  {{ req.username }} · {{ formatDate(req.createdAt) }}
                </div>
              </div>
              <q-badge
                :color="urgencyColor(req.urgency)"
                text-color="white"
                class="q-ml-sm q-mt-xs"
              >
                {{ req.urgency }}
              </q-badge>
            </div>
          </q-card-section>

          <!-- Description -->
          <q-card-section class="q-pt-xs q-pb-sm">
            <div class="repair-card__description text-body2">{{ req.description }}</div>
          </q-card-section>

          <q-separator inset />

          <!-- Skills -->
          <q-card-section v-if="req.skills.length" class="q-py-sm">
            <div class="row q-gutter-xs items-center">
              <q-icon name="handyman" color="grey" size="xs" />
              <q-chip
                v-for="sk in req.skills"
                :key="sk.id"
                dense square
                color="primary" text-color="white"
                size="sm"
              >
                {{ sk.name }}
              </q-chip>
            </div>
          </q-card-section>

          <q-separator v-if="req.skills.length" inset />

          <!-- Location -->
          <q-card-section
            v-if="req.street || req.city || req.postalCode"
            class="q-py-sm"
          >
            <div class="row items-center text-caption text-grey no-wrap">
              <q-icon name="location_on" size="xs" class="q-mr-xs" color="grey" />
              <span class="ellipsis">
                {{ [req.street, req.postalCode, req.city].filter(Boolean).join(', ') }}
              </span>
            </div>
          </q-card-section>

          <!-- Owner actions -->
          <template v-if="auth.user && auth.user.id === req.userId">
            <q-separator inset />
            <q-card-actions align="right" class="q-py-xs">
              <q-btn flat dense round icon="delete" color="negative" size="sm" @click="deleteRequest(req)" />
            </q-card-actions>
          </template>
        </q-card>
      </div>
    </div>

    <!-- ── FAB ──────────────────────────────────────────────────────────── -->
    <q-page-sticky v-if="auth.isAuthenticated" position="bottom-right" :offset="[24, 24]">
      <q-btn fab icon="add" color="primary" label="New request" @click="dialogOpen = true" />
    </q-page-sticky>

    <!-- ── Create dialog ─────────────────────────────────────────────────── -->
    <q-dialog v-model="dialogOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="column no-wrap" style="height: 100%">

        <q-toolbar class="bg-primary text-white">
          <q-toolbar-title>New Repair Request</q-toolbar-title>
          <q-btn flat round dense icon="close" @click="cancelDialog" />
        </q-toolbar>

        <q-scroll-area class="col">
          <div class="q-pa-md" style="max-width: 680px; margin: 0 auto">

            <!-- Title -->
            <q-input
              v-model="form.title"
              label="Title *"
              outlined dense
              class="q-mb-sm"
              :error="!!formErrors.title"
              :error-message="formErrors.title"
            />

            <!-- Category + Urgency -->
            <div class="row q-col-gutter-sm q-mb-sm">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.category"
                  label="Category"
                  :options="CATEGORIES"
                  outlined dense clearable
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.urgency"
                  label="Urgency"
                  :options="URGENCY_OPTIONS"
                  emit-value map-options
                  outlined dense
                />
              </div>
            </div>

            <!-- Description -->
            <q-input
              v-model="form.description"
              label="Description *"
              type="textarea"
              outlined dense
              autogrow
              class="q-mb-sm"
              :error="!!formErrors.description"
              :error-message="formErrors.description"
            />

            <!-- Budget -->
            <div class="text-caption text-weight-medium q-mb-xs q-mt-xs">Budget (optional)</div>
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <q-input v-model.number="form.budgetMin" label="Min (€)" type="number" outlined dense :min="0" />
              </div>
              <div class="col-6">
                <q-input v-model.number="form.budgetMax" label="Max (€)" type="number" outlined dense :min="0" />
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <!-- Location -->
            <div class="text-subtitle2 text-weight-medium q-mb-sm">
              <q-icon name="location_on" class="q-mr-xs" />Location
            </div>
            <div class="q-gutter-y-sm q-mb-md">
              <q-input v-model="form.street" label="Street & number" outlined dense />
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.postalCode" label="Postal code" outlined dense />
                </div>
                <div class="col-12 col-sm-8">
                  <q-input v-model="form.city" label="City" outlined dense />
                </div>
              </div>
              <q-select
                v-model="form.country"
                label="Country"
                :options="countryOptions"
                outlined dense clearable
                use-input input-debounce="0"
                @filter="filterCountries"
              />
            </div>

            <q-separator class="q-mb-md" />

            <!-- Skills -->
            <div class="text-subtitle2 text-weight-medium q-mb-sm">
              <q-icon name="handyman" class="q-mr-xs" />Skills needed
            </div>
            <SkillsSelector v-model="form.skills" />

          </div>
        </q-scroll-area>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" @click="cancelDialog" />
          <q-btn
            unelevated color="primary"
            icon="send" label="Submit"
            :loading="submitting"
            @click="submit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../composables/useApi.js'
import { useAppStore } from '../stores/app.js'
import { useAuthStore } from '../stores/auth.js'
import SkillsSelector from '../components/shared/Skills.vue'

const $q   = useQuasar()
const app  = useAppStore()
const auth = useAuthStore()

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Electronics', 'Plumbing', 'Carpentry', 'Masonry', 'Painting',
  'Electrical', 'HVAC', 'Automotive', 'Appliances', 'Furniture', 'Other',
]

const URGENCY_OPTIONS = [
  { label: 'Low',    value: 'low'    },
  { label: 'Medium', value: 'medium' },
  { label: 'High',   value: 'high'   },
]

// ── List state ────────────────────────────────────────────────────────────────

const requests       = ref([])
const loading        = ref(false)
const filterText     = ref('')
const filterCategory = ref(null)
const filterUrgency  = ref(null)

const filteredRequests = computed(() => {
  let list = requests.value
  const q = filterText.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.skills.some(s => s.name.toLowerCase().includes(q)) ||
      [r.city, r.street, r.postalCode].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
  }
  if (filterCategory.value) {
    list = list.filter(r => r.category === filterCategory.value)
  }
  if (filterUrgency.value) {
    list = list.filter(r => r.urgency === filterUrgency.value)
  }
  return list
})

async function loadRequests() {
  loading.value = true
  try {
    requests.value = await api.get('/repairs')
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Failed to load requests', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ── Form / Dialog ─────────────────────────────────────────────────────────────

const dialogOpen = ref(false)
const submitting = ref(false)
const formErrors = reactive({ title: '', description: '' })

function emptyForm() {
  return {
    title:       '',
    description: '',
    category:    null,
    urgency:     'medium',
    budgetMin:   null,
    budgetMax:   null,
    street:      '',
    city:        '',
    postalCode:  '',
    country:     null,
    skills:      [],
  }
}

const form = reactive(emptyForm())

function resetForm() {
  Object.assign(form, emptyForm())
  formErrors.title = ''
  formErrors.description = ''
}

function cancelDialog() {
  dialogOpen.value = false
  resetForm()
}

function validate() {
  formErrors.title = ''
  formErrors.description = ''
  let ok = true
  if (!form.title || form.title.length < 3) {
    formErrors.title = 'Title is required (min 3 characters)'
    ok = false
  }
  if (!form.description || form.description.length < 10) {
    formErrors.description = 'Description is required (min 10 characters)'
    ok = false
  }
  return ok
}

async function submit() {
  if (!validate()) return

  submitting.value = true
  try {
    const created = await api.post('/repairs', {
      title:       form.title,
      description: form.description,
      category:    form.category   ?? undefined,
      urgency:     form.urgency,
      budgetMin:   form.budgetMin  ?? undefined,
      budgetMax:   form.budgetMax  ?? undefined,
      street:      form.street     || undefined,
      city:        form.city       || undefined,
      postalCode:  form.postalCode || undefined,
      country:     form.country?.value ?? form.country ?? undefined,
      skillIds:    form.skills.map(s => s.skillId),
    })

    requests.value = [created, ...requests.value]
    $q.notify({ type: 'positive', message: 'Request posted!', position: 'top' })
    dialogOpen.value = false
    resetForm()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Submit failed', position: 'top' })
  } finally {
    submitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

function deleteRequest(req) {
  $q.dialog({
    title:   'Delete request',
    message: `Delete "${req.title}"?`,
    ok:      { label: 'Delete', color: 'negative', flat: true },
    cancel:  { label: 'Cancel', flat: true },
  }).onOk(async () => {
    try {
      await api.delete(`/repairs/${req.id}`)
      requests.value = requests.value.filter(r => r.id !== req.id)
      $q.notify({ type: 'positive', message: 'Request deleted', position: 'top' })
    } catch (err) {
      $q.notify({ type: 'negative', message: err.message ?? 'Delete failed', position: 'top' })
    }
  })
}

// ── Country filter ────────────────────────────────────────────────────────────

const countryOptions = ref([])

function filterCountries(val, update) {
  update(() => {
    const q = val.trim().toLowerCase()
    countryOptions.value = app.countries
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.iso2.toLowerCase().includes(q))
      .map(c => ({ label: c.name, value: c.iso2 }))
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urgencyColor(urgency) {
  return { low: 'positive', medium: 'warning', high: 'negative' }[urgency] ?? 'grey'
}

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(loadRequests)
</script>

<style scoped>
.repairs-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(26, 26, 46, 0.92);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.repairs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding-top: 16px;
}

.repair-card {
  display: flex;
  flex-direction: column;
  background: #22223a;
}

.repair-card__description {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
}
</style>
