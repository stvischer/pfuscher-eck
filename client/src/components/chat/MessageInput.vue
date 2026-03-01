<template>
  <div class="message-input row items-end q-pa-sm q-gutter-xs">
    <q-input
      v-model="draft"
      outlined
      dense
      autogrow
      :placeholder="placeholder"
      :disable="disable"
      class="col"
      bg-color="blue-grey-10"
      input-style="max-height: 120px; overflow-y: auto"
      @keydown.enter.exact.prevent="send"
    >
      <template #append>
        <q-btn flat round dense size="sm" icon="tag_faces" @click="emojiDialog = true" />
      </template>
    </q-input>

    <q-btn
      color="primary"
      icon="send"
      unelevated
      round
      size="md"
      :disable="disable || !draft.trim()"
      @click="send"
    />

    <q-dialog v-model="emojiDialog">
      <q-card class="emoji-dialog-card" dark>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle2">Pick an emoji</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-sm">
          <EmojiPicker
            :native="true"
            theme="dark"
            :disable-skin-tones="true"
            :hide-group-names="true"
            @select="onEmojiSelect"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

const props = defineProps({
  placeholder: { type: String, default: 'Type a message…' },
  disable:     { type: Boolean, default: false },
})

const emit = defineEmits(['send'])

const draft      = ref('')
const emojiDialog = ref(false)

function onEmojiSelect(emoji) {
  draft.value += emoji.i
}

function send() {
  const content = draft.value.trim()
  if (!content) return
  emit('send', content)
  draft.value = ''
}
</script>

<style scoped>
.message-input {
  background: rgba(255, 255, 255, 0.04);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.emoji-dialog-card {
  background: #1e272e;
}
</style>
