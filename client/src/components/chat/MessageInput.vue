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
    />
    <q-btn
      color="primary"
      icon="send"
      unelevated
      round
      size="md"
      :disable="disable || !draft.trim()"
      @click="send"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: 'Type a message…' },
  disable:     { type: Boolean, default: false },
})

const emit = defineEmits(['send'])

const draft = ref('')

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
</style>
