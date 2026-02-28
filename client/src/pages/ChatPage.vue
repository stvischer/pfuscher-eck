<template>
  <q-page padding class="column" style="height: calc(100vh - 50px)">

    <div class="text-h6 q-mb-md">
      <q-icon name="chat" class="q-mr-sm" />Chat
    </div>

    <!-- Message list -->
    <q-scroll-area ref="scrollArea" class="col message-area q-pa-sm rounded-borders">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="q-mb-sm row"
        :class="msg.self ? 'justify-end' : 'justify-start'"
      >
        <q-chat-message
          :text="[msg.text]"
          :name="msg.self ? 'You' : msg.username"
          :sent="msg.self"
          :stamp="msg.timestamp"
          :bg-color="msg.self ? 'primary' : 'grey-3'"
          :text-color="msg.self ? 'white' : 'dark'"
        />
      </div>
      <div v-if="messages.length === 0" class="text-grey text-center q-py-lg">
        No messages yet. Say hi!
      </div>
    </q-scroll-area>

    <!-- Input -->
    <q-form class="row q-mt-sm q-gutter-sm" @submit.prevent="send">
      <q-input
        v-model="draft"
        outlined
        dense
        autogrow
        placeholder="Type a message…"
        class="col"
        @keydown.enter.exact.prevent="send"
      />
      <q-btn
        type="submit"
        color="primary"
        icon="send"
        :disable="!draft.trim()"
        unelevated
        round
      />
    </q-form>

  </q-page>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const auth       = useAuthStore()
const draft      = ref('')
const scrollArea = ref(null)
const messages   = ref([])

function scrollToBottom() {
  nextTick(() => {
    scrollArea.value?.setScrollPercentage('vertical', 1)
  })
}

function send() {
  const text = draft.value.trim()
  if (!text) return

  messages.value.push({
    text,
    self:      true,
    username:  auth.user?.username,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  })

  draft.value = ''
  scrollToBottom()
}
</script>

<style scoped>
.message-area {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 200px;
}
</style>
