<template>
  <div class="chat-message row no-wrap q-mb-sm" :class="sent ? 'justify-end' : 'justify-start'">

    <!-- Avatar (received side) -->
    <q-avatar v-if="!sent" size="32px" color="grey-7" text-color="white" class="q-mt-xs q-mr-sm flex-no-shrink">
      {{ initials }}
    </q-avatar>

    <!-- Bubble -->
    <div class="bubble-wrap" :class="sent ? 'items-end' : 'items-start'">
      <div v-if="!sent" class="text-caption text-grey-5 q-mb-xs">{{ username }}</div>
      <div
        class="bubble q-pa-sm"
        :class="sent ? 'bubble--sent' : 'bubble--received'"
      >
        {{ content }}
      </div>
      <div class="text-caption text-grey-5 q-mt-xs">{{ stamp }}</div>
    </div>

    <!-- Avatar (sent side) -->
    <q-avatar v-if="sent" size="32px" color="primary" text-color="white" class="q-mt-xs q-ml-sm flex-no-shrink">
      {{ initials }}
    </q-avatar>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  username: { type: String, required: true },
  content:  { type: String, required: true },
  stamp:    { type: String, default: '' },
  sent:     { type: Boolean, default: false },
})

const initials = computed(() =>
  props.username
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join(''),
)
</script>

<style scoped>
.flex-no-shrink { flex-shrink: 0; }

.bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.bubble {
  border-radius: 12px;
  word-break: break-word;
  font-size: 0.9rem;
  line-height: 1.4;
}

.bubble--sent {
  background: var(--q-primary);
  color: #fff;
  border-bottom-right-radius: 3px;
}

.bubble--received {
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  border-bottom-left-radius: 3px;
}
</style>
