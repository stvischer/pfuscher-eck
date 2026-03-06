<template>
  <div class="chat-room-list column fit">
    <!-- Header -->
    <div class="q-pa-md row items-center justify-between">
      <span class="text-subtitle1 text-weight-bold">Chats</span>
      <q-btn flat round dense icon="add" @click="$emit('create')" />
    </div>

    <q-separator />

    <!-- Loading -->
    <div v-if="loading" class="col column items-center justify-center text-grey">
      <q-spinner size="24px" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="rooms.length === 0"
      class="col column items-center justify-center text-grey text-caption q-pa-md text-center"
    >
      No chats yet.
    </div>

    <!-- List -->
    <q-scroll-area v-else class="col">
      <q-list padding>
        <q-item
          v-for="room in rooms"
          :key="room.id"
          v-ripple
          clickable
          :active="modelValue === room.id"
          active-class="chat-room-list__item--active"
          class="rounded-borders q-mb-xs"
          @click="$emit('update:modelValue', room.id)"
        >
          <q-item-section avatar>
            <q-avatar
              :color="room.visibility === 'public' ? 'teal' : 'indigo'"
              text-color="white"
              size="38px"
            >
              <q-icon :name="room.type === 'direct' ? 'person' : 'group'" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ roomLabel(room) }}</q-item-label>
            <q-item-label caption class="text-grey-5">
              {{ room.visibility === 'public' ? 'Public' : 'Private' }} ·
              {{ room.type === 'direct' ? 'Direct' : 'Group' }}
            </q-item-label>
          </q-item-section>

          <q-item-section v-if="unread[room.id]" side>
            <q-badge color="primary" :label="unread[room.id]" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { api } from '../../composables/useApi.js';
import { useSocket } from '../../composables/useSocket.js';

const props = defineProps({
  modelValue: { type: String, default: null }, // selected room id
});
defineEmits(['update:modelValue', 'create']);

const rooms = ref([]);
const loading = ref(true);
const unread = reactive({});

const { socket } = useSocket();

function roomLabel(room) {
  return room.name ?? (room.type === 'direct' ? 'Direct Message' : 'Group Chat');
}

async function fetchRooms() {
  loading.value = true;
  try {
    rooms.value = await api.get('/chat/rooms');
  } catch {
    rooms.value = [];
  } finally {
    loading.value = false;
  }
}

// Increment unread badge when a message arrives in a non-active room
socket.on('message:new', (msg) => {
  if (msg.chatId !== props.modelValue) {
    unread[msg.chatId] = (unread[msg.chatId] ?? 0) + 1;
  }
});

// Clear unread when room is selected
watch(
  () => props.modelValue,
  (id) => {
    if (id) delete unread[id];
  },
);

onMounted(fetchRooms);

// Expose so parent can refresh or read rooms
defineExpose({ fetchRooms, rooms });
</script>
