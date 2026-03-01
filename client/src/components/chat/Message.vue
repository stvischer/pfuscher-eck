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
        <!-- Attachments -->
        <div v-if="attachment && attachment.length" class="attachments q-mb-xs">
          <div v-for="(att, i) in attachment" :key="i" class="attachment-item">
            <!-- Image -->
            <a v-if="att.mimetype?.startsWith('image/')" :href="att.url" target="_blank">
              <q-img
                :src="att.url"
                class="attachment-img rounded-borders"
                fit="cover"
                no-spinner
              />
            </a>
            <!-- Other file -->
            <a
              v-else
              :href="att.url"
              :download="att.name"
              class="attachment-file row items-center q-pa-xs rounded-borders no-decoration"
            >
              <q-icon name="insert_drive_file" size="22px" class="q-mr-sm" />
              <div class="col ellipsis">
                <div class="text-caption text-weight-medium ellipsis">{{ att.name }}</div>
                <div class="text-caption opacity-70">{{ formatSize(att.size) }}</div>
              </div>
              <q-icon name="download" size="16px" class="q-ml-xs" />
            </a>
          </div>
        </div>
        <!-- Text content -->
        <span v-if="content">{{ content }}</span>
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
  username:   { type: String, required: true },
  content:    { type: String, default: '' },
  stamp:      { type: String, default: '' },
  sent:       { type: Boolean, default: false },
  attachment: { type: Array, default: () => [] },
})

const initials = computed(() =>
  props.username
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join(''),
)

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
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

.attachments {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attachment-img {
  width: 220px;
  max-width: 100%;
  border-radius: 8px;
  cursor: pointer;
}

.attachment-file {
  width: 220px;
  max-width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  transition: background 0.15s;
}

.attachment-file:hover {
  background: rgba(0, 0, 0, 0.4);
}

.no-decoration {
  text-decoration: none;
}
</style>
