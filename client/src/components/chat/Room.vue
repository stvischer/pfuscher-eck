<template>
  <div class="chat-room column fit">

    <!-- No room selected -->
    <div v-if="!roomId" class="col column items-center justify-center text-grey">
      <q-icon name="forum" size="48px" class="q-mb-md text-grey-6" />
      <div class="text-subtitle1">Select a chat to start messaging</div>
    </div>

    <template v-else>
      <!-- Room header -->
      <div class="room-header q-pa-sm q-px-md row items-center no-wrap">
        <q-btn
          v-if="$q.screen.lt.md"
          flat round dense
          icon="arrow_back"
          class="q-mr-sm"
          @click="$emit('back')"
        />
        <q-avatar :color="room?.type === 'direct' ? 'indigo' : 'teal'" text-color="white" size="36px" class="q-mr-sm">
          <q-icon :name="room?.type === 'direct' ? 'person' : 'group'" />
        </q-avatar>
        <div class="col">
          <div class="text-subtitle2 text-weight-bold">{{ roomTitle }}</div>
          <div class="text-caption text-grey-5">{{ room?.visibility }} · {{ room?.type }}</div>
        </div>
      </div>

      <q-separator />

      <!-- Messages -->
      <q-scroll-area ref="scrollArea" class="col q-pa-md">
        <div v-if="loadingMsgs" class="column items-center q-py-lg text-grey">
          <q-spinner size="24px" />
        </div>
        <template v-else>
          <div v-if="messages.length === 0" class="text-grey text-center q-py-lg text-caption">
            No messages yet. Say something!
          </div>
          <ChatMessage
            v-for="msg in messages"
            :key="msg.id"
            :username="msg.username"
            :content="msg.content"
            :stamp="formatStamp(msg.created_at)"
            :sent="msg.user_id === auth.user?.id"
          />
        </template>
      </q-scroll-area>

      <q-separator />

      <!-- Input -->
      <div class="q-pa-sm row q-gutter-sm items-end">
        <q-input
          v-model="draft"
          outlined
          dense
          autogrow
          placeholder="Type a message…"
          class="col"
          input-style="max-height: 120px; overflow-y: auto"
          @keydown.enter.exact.prevent="send"
        />
        <q-btn
          color="primary"
          icon="send"
          unelevated
          round
          :disable="!draft.trim()"
          @click="send"
        />
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import ChatMessage from './Message.vue'
import { api } from '../../composables/useApi.js'
import { useSocket } from '../../composables/useSocket.js'
import { useAuthStore } from '../../stores/auth.js'

const props = defineProps({
  roomId: { type: String, default: null },
  room:   { type: Object, default: null },
})
const emit = defineEmits(['back'])

const $q         = useQuasar()
const auth       = useAuthStore()
const { socket } = useSocket()

const messages  = ref([])
const draft     = ref('')
const scrollArea = ref(null)
const loadingMsgs = ref(false)

const roomTitle = computed(() =>
  props.room?.name ?? (props.room?.type === 'direct' ? 'Direct Message' : 'Group Chat'),
)

function formatStamp(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  nextTick(() => scrollArea.value?.setScrollPercentage('vertical', 1))
}

async function loadMessages(id) {
  loadingMsgs.value = true
  messages.value = []
  try {
    messages.value = await api.get(`/chat/rooms/${id}/messages`)
    scrollToBottom()
  } catch {
    messages.value = []
  } finally {
    loadingMsgs.value = false
  }
}

// Re-join room and reload messages when roomId changes
watch(() => props.roomId, (newId, oldId) => {
  if (oldId) socket.emit('room:leave', oldId)
  if (newId) {
    socket.emit('room:join', newId)
    loadMessages(newId)
  } else {
    messages.value = []
  }
}, { immediate: true })

// Receive new messages from server
socket.on('message:new', (msg) => {
  if (msg.chatId !== props.roomId) return
  messages.value.push(msg)
  scrollToBottom()
})

function send() {
  const content = draft.value.trim()
  if (!content || !props.roomId) return

  socket.emit('message:send', { roomId: props.roomId, content })
  draft.value = ''
}

onUnmounted(() => {
  if (props.roomId) socket.emit('room:leave', props.roomId)
  socket.off('message:new')
})
</script>

<style scoped>
.room-header {
  min-height: 56px;
}
</style>
