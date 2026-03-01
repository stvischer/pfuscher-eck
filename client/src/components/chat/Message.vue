<template>
  <div class="chat-message row no-wrap q-mb-sm" :class="sent ? 'justify-end' : 'justify-start'">

    <!-- Avatar (received side) -->
    <q-avatar v-if="!sent" size="32px" color="grey-7" text-color="white" class="q-mt-xs q-mr-sm" style="flex-shrink:0">
      {{ initials }}
    </q-avatar>

    <!-- Bubble + actions wrapper -->
    <div
      class="chat-message__bubble-wrap"
      :class="[sent ? 'items-end' : 'items-start', sent ? 'chat-message__bubble-wrap--sent' : '']"
    >
      <div v-if="!sent" class="text-caption text-grey-5 q-mb-xs">{{ username }}</div>

      <!-- Hover action bar -->
      <div class="chat-message__actions" :class="sent ? 'chat-message__actions--sent' : ''">
        <q-btn flat round dense size="xs" icon="reply" color="grey-4"
          @click="$emit('reply', { id: msgId, username, content })" />
        <q-btn flat round dense size="xs" icon="add_reaction" color="grey-4">
          <q-menu auto-close anchor="top middle" self="bottom middle">
            <div class="chat-message__quick-emojis">
              <button
                v-for="e in QUICK_EMOJIS" :key="e"
                class="chat-message__quick-emoji"
                @click="$emit('react', { msgId, emoji: e })"
              >{{ e }}</button>
            </div>
          </q-menu>
        </q-btn>
      </div>

      <!-- Bubble -->
      <div
        class="chat-message__bubble q-pa-sm"
        :class="sent ? 'chat-message__bubble--sent' : 'chat-message__bubble--received'"
      >
        <!-- Reply quote -->
        <div v-if="replyTo" class="chat-message__quote">
          <div class="chat-message__quote-author">{{ replyTo.username }}</div>
          <div class="chat-message__quote-content">{{ replyTo.content || '📎 Attachment' }}</div>
        </div>

        <!-- Attachments -->
        <div v-if="attachment && attachment.length" class="chat-message__attachments q-mb-xs">
          <div v-for="(att, i) in attachment" :key="i">
            <a v-if="att.mimetype?.startsWith('image/')" :href="att.url" target="_blank">
              <q-img
                :src="att.url"
                class="chat-message__attachment-img rounded-borders"
                fit="cover"
                no-spinner
              />
            </a>
            <a
              v-else
              :href="att.url"
              :download="att.name"
              class="chat-message__attachment-file row items-center q-pa-xs rounded-borders"
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

      <!-- Reactions strip -->
      <div v-if="groupedReactions.length" class="chat-message__reactions">
        <button
          v-for="r in groupedReactions"
          :key="r.emoji"
          class="chat-message__reaction"
          :class="{ 'chat-message__reaction--active': r.reacted }"
          @click="$emit('react', { msgId, emoji: r.emoji })"
        >{{ r.emoji }} {{ r.count }}</button>
      </div>

      <div class="text-caption text-grey-5 q-mt-xs">{{ stamp }}</div>
    </div>

    <!-- Avatar (sent side) -->
    <q-avatar v-if="sent" size="32px" color="primary" text-color="white" class="q-mt-xs q-ml-sm" style="flex-shrink:0">
      {{ initials }}
    </q-avatar>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉']

const props = defineProps({
  msgId:         { type: [Number, String], required: true },
  username:      { type: String, required: true },
  content:       { type: String, default: '' },
  stamp:         { type: String, default: '' },
  sent:          { type: Boolean, default: false },
  attachment:    { type: Array, default: () => [] },
  replyTo:       { type: Object, default: null },   // { username, content }
  reactions:     { type: Array,  default: () => [] }, // [{ emoji, userId }]
  currentUserId: { type: Number, default: null },
})

const emit = defineEmits(['reply', 'react'])

const initials = computed(() =>
  props.username
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join(''),
)

const groupedReactions = computed(() => {
  const map = {}
  for (const r of props.reactions) {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, reacted: false }
    map[r.emoji].count++
    if (Number(r.userId) === props.currentUserId) map[r.emoji].reacted = true
  }
  return Object.values(map)
})

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>


