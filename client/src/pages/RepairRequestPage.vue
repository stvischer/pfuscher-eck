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
          <!-- Header: title + date -->
          <q-card-section class="q-pb-xs">
            <div class="text-subtitle1 text-weight-bold">{{ req.title }}</div>
            <div class="text-caption text-grey">
              {{ req.username }} · {{ formatDate(req.createdAt) }}
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
            v-if="req.address?.street || req.address?.city || req.address?.postalCode"
            class="q-py-sm"
          >
            <div class="row items-center text-caption text-grey no-wrap">
              <q-icon name="location_on" size="xs" class="q-mr-xs" color="grey" />
              <span class="ellipsis">
                {{ [req.address?.street, req.address?.postalCode, req.address?.city].filter(Boolean).join(', ') }}
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
          <RepairRequestForm ref="formRef" @submitted="onSubmitted" />
        </q-scroll-area>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" @click="cancelDialog" />
          <q-btn
            unelevated color="primary"
            icon="send" label="Submit"
            :loading="formRef?.submitting"
            @click="formRef?.submit()"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../composables/useApi.js'
import { useAuthStore } from '../stores/auth.js'
import RepairRequestForm from '../components/request/RepairRequestForm.vue'

const $q   = useQuasar()
const auth = useAuthStore()

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Electronics', 'Plumbing', 'Carpentry', 'Masonry', 'Painting',
  'Electrical', 'HVAC', 'Automotive', 'Appliances', 'Furniture', 'Other',
]

// ── List state ────────────────────────────────────────────────────────────────

const requests       = ref([])
const loading        = ref(false)
const filterText     = ref('')
const filterCategory = ref(null)

const filteredRequests = computed(() => {
  let list = requests.value
  const q = filterText.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.skills.some(s => s.name.toLowerCase().includes(q)) ||
      [r.address?.city, r.address?.street, r.address?.postalCode].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
  }
  if (filterCategory.value) {
    list = list.filter(r => r.category === filterCategory.value)
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
const formRef    = ref(null)

function cancelDialog() {
  dialogOpen.value = false
  formRef.value?.reset()
}

function onSubmitted(created) {
  requests.value = [created, ...requests.value]
  dialogOpen.value = false
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

// ── Helpers ───────────────────────────────────────────────────────────────────



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
