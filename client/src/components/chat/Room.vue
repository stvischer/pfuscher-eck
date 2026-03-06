<template>
  <div class="chat-room column fit">
    <!-- No room selected -->
    <div v-if="!roomId" class="col column items-center justify-center text-grey">
      <q-icon name="forum" size="48px" class="q-mb-md text-grey-6" />
      <div class="text-subtitle1">Select a chat to start messaging</div>
    </div>

    <template v-else>
      <!-- Room header -->
      <div class="chat-room__header q-px-md row items-center no-wrap">
        <q-btn
          v-if="$q.screen.lt.md"
          flat
          round
          dense
          icon="arrow_back"
          class="q-mr-sm"
          @click="$emit('back')"
        />
        <q-avatar
          :color="room?.type === 'direct' ? 'indigo' : 'teal'"
          text-color="white"
          size="38px"
          class="q-mr-sm"
        >
          <q-icon :name="room?.type === 'direct' ? 'person' : 'group'" size="20px" />
        </q-avatar>
        <div class="col">
          <div class="text-subtitle2 text-weight-bold">{{ roomTitle }}</div>
          <div class="text-caption text-grey-5">
            <q-icon
              :name="room?.visibility === 'public' ? 'public' : 'lock'"
              size="11px"
              class="q-mr-xs"
            />
            {{ room?.visibility }} · {{ room?.type }}
          </div>
        </div>
      </div>

      <q-separator />

      <!-- Messages + scroll-to-bottom FAB -->
      <div class="chat-room__scroll-container col">
        <q-scroll-area ref="scrollArea" class="fit chat-room__messages" @scroll="onScroll">
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
                :msg-id="msg.id"
                :username="msg.username"
                :content="msg.content"
                :stamp="formatStamp(msg.created_at)"
                :sent="Number(msg.user_id) === auth.user?.id"
                :attachment="msg.attachment || []"
                :reply-to="
                  msg.reply_to ? { username: msg.reply_username, content: msg.reply_content } : null
                "
                :reactions="msg.reactions || []"
                :current-user-id="auth.user?.id"
                @reply="onReply"
                @react="onReact"
              />
              <div ref="bottomAnchor" />
            </template>
          </div>
        </q-scroll-area>

        <transition name="fade">
          <q-btn
            v-if="showScrollBtn"
            class="chat-room__scroll-btn"
            round
            unelevated
            color="primary"
            icon="keyboard_double_arrow_down"
            size="sm"
            @click="scrollToBottom"
          />
        </transition>
      </div>

      <!-- Input bar -->
      <ChatMessageInput :reply-to="replyTo" @send="send" @cancel-reply="replyTo = null" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import ChatMessage from './Message.vue';
import ChatMessageInput from './MessageInput.vue';
import { api } from '../../composables/useApi.js';
import { useSocket } from '../../composables/useSocket.js';
import { useAuthStore } from '../../stores/auth.js';

const props = defineProps({
  roomId: { type: String, default: null },
  room: { type: Object, default: null },
});
defineEmits(['back']);

const $q = useQuasar();
const auth = useAuthStore();
const { socket } = useSocket();

const messages = ref([]);
const scrollArea = ref(null);
const bottomAnchor = ref(null);
const loadingMsgs = ref(false);
const showScrollBtn = ref(false);
const replyTo = ref(null);

function onScroll({ verticalPosition, verticalSize, verticalContainerSize }) {
  const distFromBottom = verticalSize - verticalContainerSize - verticalPosition;
  showScrollBtn.value = distFromBottom > 80;
}

const roomTitle = computed(
  () => props.room?.name ?? (props.room?.type === 'direct' ? 'Direct Message' : 'Group Chat'),
);

function formatStamp(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  showScrollBtn.value = false;
  nextTick(() => bottomAnchor.value?.scrollIntoView({ block: 'end' }));
}

async function loadMessages(id) {
  loadingMsgs.value = true;
  messages.value = [];
  try {
    messages.value = await api.get(`/chat/rooms/${id}/messages`);
  } catch {
    messages.value = [];
  } finally {
    loadingMsgs.value = false;
    scrollToBottom();
  }
}

// Re-join room and reload messages when roomId changes
watch(
  () => props.roomId,
  (newId, oldId) => {
    if (oldId) socket.emit('room:leave', oldId);
    if (newId) {
      socket.emit('room:join', newId);
      loadMessages(newId);
    } else {
      messages.value = [];
    }
  },
  { immediate: true },
);

// Re-join current room after a socket reconnect (server-side rooms don't persist)
function onReconnect() {
  if (props.roomId) socket.emit('room:join', props.roomId);
}

// Receive new messages from server
function onMessageNew(msg) {
  if (msg.chatId !== props.roomId) return;
  if (!msg.reactions) msg.reactions = [];
  messages.value.push(msg);
  scrollToBottom();
}

// Update reactions when any user reacts
function onReactionUpdate({ messageId, reactions }) {
  const msg = messages.value.find((m) => m.id === messageId);
  if (msg) msg.reactions = reactions;
}

// User clicked reply on a message
function onReply({ id, username, content }) {
  replyTo.value = { id, username, content };
}

// User picked a quick emoji reaction
function onReact({ msgId, emoji }) {
  socket.emit('message:react', { messageId: msgId, emoji });
}

onMounted(() => {
  socket.on('connect', onReconnect);
  socket.on('message:new', onMessageNew);
  socket.on('reaction:update', onReactionUpdate);
});

function send({ content, attachment = [], replyTo: replyToId = null }) {
  if ((!content?.trim() && !attachment?.length) || !props.roomId) return;
  socket.emit('message:send', { roomId: props.roomId, content, attachment, replyTo: replyToId });
  replyTo.value = null;
}

onUnmounted(() => {
  if (props.roomId) socket.emit('room:leave', props.roomId);
  socket.off('connect', onReconnect);
  socket.off('message:new', onMessageNew);
  socket.off('reaction:update', onReactionUpdate);
});
</script>
