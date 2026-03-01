<template>
  <div class="chat-room column fit">

    <!-- No room selected -->
    <div v-if="!roomId" class="col column items-center justify-center text-grey">
      <q-icon name="forum" size="48px" class="q-mb-md text-grey-6" />
      <div class="text-subtitle1">Select a chat to start messaging</div>
    </div>

    <template v-else>
      <!-- Room header -->
      <div class="room-header q-px-md row items-center no-wrap">
        <q-btn
          v-if="$q.screen.lt.md"
          flat round dense
          icon="arrow_back"
          class="q-mr-sm"
          @click="$emit('back')"
        />
        <q-avatar :color="room?.type === 'direct' ? 'indigo' : 'teal'" text-color="white" size="38px" class="q-mr-sm">
          <q-icon :name="room?.type === 'direct' ? 'person' : 'group'" size="20px" />
        </q-avatar>
        <div class="col">
          <div class="text-subtitle2 text-weight-bold">{{ roomTitle }}</div>
          <div class="text-caption text-grey-5">
            <q-icon :name="room?.visibility === 'public' ? 'public' : 'lock'" size="11px" class="q-mr-xs" />
            {{ room?.visibility }} · {{ room?.type }}
          </div>
        </div>
      </div>

      <q-separator />

      <!-- Messages -->
      <q-scroll-area ref="scrollArea" class="col message-area" style="min-height: 0">
        <div class="q-pa-md">
          <div v-if="loadingMsgs" class="column items-center q-py-xl text-grey">
            <q-spinner size="28px" color="primary" />
            <div class="text-caption q-mt-sm">Loading messages…</div>
          </div>
          <template v-else>
            <div v-if="messages.length === 0" class="column items-center q-py-xl text-grey-5">
              <q-icon name="chat_bubble_outline" size="40px" class="q-mb-sm" />
              <div class="text-caption">No messages yet. Say something!</div>
            </div>
            <ChatMessage
              v-for="msg in messages"
              :key="msg.id"
              :username="msg.username"
              :content="msg.content"
              :stamp="formatStamp(msg.created_at)"
              :sent="Number(msg.user_id) === auth.user?.id"
            />
          </template>
        </div>
      </q-scroll-area>

      <!-- Input bar -->
      <div class="input-bar row items-end q-pa-sm q-gutter-xs">
        <q-input
          v-model="draft"
          outlined
          dense
          autogrow
          placeholder="Type a message…"
          class="col"
          bg-color="blue-grey-10"
          input-style="max-height: 120px; overflow-y: auto"
          @keydown.enter.exact.prevent="send"
        />
        <q-btn
          color="primary"
          icon="send"
          unelevated
          round
          size="md"
          :disable="!draft.trim()"
          @click="send"
        />
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
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

// Re-join current room after a socket reconnect (server-side rooms don't persist)
function onReconnect() {
  if (props.roomId) socket.emit('room:join', props.roomId)
}

// Receive new messages from server
function onMessageNew(msg) {
  if (msg.chatId !== props.roomId) return
  messages.value.push(msg)
  scrollToBottom()
}

onMounted(() => {
  socket.on('connect',     onReconnect)
  socket.on('message:new', onMessageNew)
})

function send() {
  const content = draft.value.trim()
  if (!content || !props.roomId) return

  socket.emit('message:send', { roomId: props.roomId, content })
  draft.value = ''
}

onUnmounted(() => {
  if (props.roomId) socket.emit('room:leave', props.roomId)
  socket.off('connect',     onReconnect)
  socket.off('message:new', onMessageNew)
})
</script>

<style scoped>
.room-header {
  min-height: 56px;
  background: rgba(255, 255, 255, 0.03);
}

.message-area {
  background: transparent;
}

.input-bar {
  background: rgba(255, 255, 255, 0.04);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
