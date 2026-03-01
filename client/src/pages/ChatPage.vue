<template>
  <q-page class="chat-page">
    <div class="chat-layout fit row">

      <!-- Room list panel -->
      <div
        class="room-list-panel"
        :class="{ 'hidden-mobile': selectedRoomId && $q.screen.lt.md }"
      >
        <ChatRoomList
          ref="roomListRef"
          v-model="selectedRoomId"
        />
      </div>

      <q-separator vertical />

      <!-- Room panel -->
      <div
        class="room-panel col"
        :class="{ 'hidden-mobile': !selectedRoomId && $q.screen.lt.md }"
      >
        <ChatRoom
          :room-id="selectedRoomId"
          :room="selectedRoom"
          @back="selectedRoomId = null"
        />
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import ChatRoomList from '../components/chat/RoomList.vue'
import ChatRoom from '../components/chat/Room.vue'

const $q             = useQuasar()
const selectedRoomId = ref(null)
const roomListRef    = ref(null)

const selectedRoom = computed(() => {
  const rooms = roomListRef.value?.rooms ?? []  // exposed if needed
  return rooms.find((r) => r.id === selectedRoomId.value) ?? null
})
</script>

<style scoped>
.chat-page {
  height: calc(100vh - 50px);
  overflow: hidden;
}

.chat-layout {
  height: 100%;
}

.room-list-panel {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.room-panel {
  overflow: hidden;
}

@media (max-width: 767px) {
  .room-list-panel {
    width: 100%;
    min-width: unset;
  }

  .hidden-mobile {
    display: none !important;
  }
}
</style>

