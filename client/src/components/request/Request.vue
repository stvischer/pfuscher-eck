<template>
  <q-card flat bordered class="repair-card" :class="{ 'repair-card--disabled': !req.isActive }">

    <!-- Disabled banner -->
    <div v-if="!req.isActive" class="repair-card__disabled-banner row items-center q-px-md q-py-xs">
      <q-icon name="visibility_off" size="xs" class="q-mr-xs" />
      <span class="text-caption">Hidden from public</span>
    </div>

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
        <q-btn
          flat dense round size="sm"
          :icon="req.isActive ? 'pause_circle' : 'play_circle'"
          :color="req.isActive ? 'warning' : 'positive'"
          :tooltip="req.isActive ? 'Disable' : 'Enable'"
          @click="toggleActive"
        >
          <q-tooltip>{{ req.isActive ? 'Disable (hide from public)' : 'Enable (make public again)' }}</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="delete" color="negative" size="sm" @click="emit('delete', req)" />
      </q-card-actions>
    </template>

  </q-card>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useAuthStore } from '../../stores/auth.js'

const props = defineProps({
  req: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['delete', 'toggle-active'])

const $q   = useQuasar()
const auth = useAuthStore()

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function toggleActive() {
  if (props.req.isActive) {
    // Confirm before disabling
    $q.dialog({
      title:   'Disable request',
      message: 'This will hide your request from the public list. You can re-enable it at any time.',
      ok:      { label: 'Disable', color: 'warning', flat: true },
      cancel:  { label: 'Cancel', flat: true },
    }).onOk(() => emit('toggle-active', props.req))
  } else {
    emit('toggle-active', props.req)
  }
}
</script>

<style scoped>
.repair-card {
  display: flex;
  flex-direction: column;
  background: #22223a;
  transition: opacity 0.2s;
}

.repair-card--disabled {
  opacity: 0.55;
}

.repair-card__disabled-banner {
  background: rgba(255, 180, 0, 0.12);
  color: #ffb400;
  border-bottom: 1px solid rgba(255, 180, 0, 0.2);
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
