<template>
  <div class="message-input-wrapper">

    <!-- Attachment preview strip -->
    <div v-if="pendingFiles.length" class="attachment-strip q-px-md q-pt-sm q-pb-xs">
      <div class="row q-gutter-sm items-start">
        <div
          v-for="(f, i) in pendingFiles"
          :key="i"
          class="attachment-preview-item"
        >
          <q-img
            v-if="f.isImage"
            :src="f.preview"
            class="attachment-thumb"
            fit="cover"
          />
          <div v-else class="attachment-file-card row no-wrap items-center q-pa-xs">
            <q-icon name="insert_drive_file" size="22px" color="grey-4" />
            <div class="q-ml-xs overflow-hidden">
              <div class="text-caption ellipsis file-name">{{ f.name }}</div>
              <div class="text-caption text-grey-5">{{ formatSize(f.size) }}</div>
            </div>
          </div>
          <q-btn
            class="remove-btn"
            round unelevated
            size="xs"
            icon="close"
            color="grey-7"
            @click="removeFile(i)"
          />
        </div>
      </div>
    </div>

    <!-- Input row -->
    <div class="message-input row items-end q-pa-sm q-gutter-xs">
      <!-- Hidden native file picker -->
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv"
        style="display:none"
        @change="onFilesSelected"
      />
      <!-- Hidden camera picker (opens camera on mobile) -->
      <input
        ref="cameraInput"
        type="file"
        accept="image/*,video/*"
        capture="environment"
        style="display:none"
        @change="onFilesSelected"
      />

      <!-- Emoji button (left, outside input) -->
      <q-btn
        flat round dense size="md"
        icon="tag_faces"
        :disable="disable"
        color="grey-4"
        @click="emojiDialog = true"
      />

      <!-- Text input -->
      <q-input
        v-model="draft"
        outlined dense autogrow
        :placeholder="placeholder"
        :disable="disable"
        class="col"
        bg-color="blue-grey-10"
        input-style="max-height: 120px; overflow-y: auto"
        @keydown.enter.exact.prevent="send"
      >
        <template #append>
          <q-btn flat round dense size="sm" icon="attach_file" color="grey-4" @click="triggerFilePicker" />
          <q-btn flat round dense size="sm" icon="photo_camera" color="grey-4" @click="triggerCamera" />
        </template>
      </q-input>

      <!-- Send button -->
      <q-btn
        color="primary"
        icon="send"
        unelevated round size="md"
        :disable="disable || (!draft.trim() && !pendingFiles.length)"
        :loading="uploading"
        @click="send"
      />
    </div>

    <!-- Emoji dialog -->
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
import { tokenStorage } from '../../composables/tokenStorage.js'

const props = defineProps({
  placeholder: { type: String, default: 'Type a message…' },
  disable:     { type: Boolean, default: false },
})

const emit = defineEmits(['send'])

const draft        = ref('')
const emojiDialog  = ref(false)
const fileInput    = ref(null)
const cameraInput  = ref(null)
const pendingFiles = ref([])   // { file, name, size, isImage, preview }
const uploading    = ref(false)

// ── Emoji ──────────────────────────────────────────────────────────────────
function onEmojiSelect(emoji) {
  draft.value += emoji.i
}

// ── Files ──────────────────────────────────────────────────────────────────
function triggerFilePicker() {
  fileInput.value?.click()
}

function triggerCamera() {
  cameraInput.value?.click()
}

function onFilesSelected(e) {
  for (const file of e.target.files) {
    const isImage = file.type.startsWith('image/')
    pendingFiles.value.push({
      file,
      name:    file.name,
      size:    file.size,
      isImage,
      preview: isImage ? URL.createObjectURL(file) : null,
    })
  }
  e.target.value = ''
}

function removeFile(i) {
  const f = pendingFiles.value[i]
  if (f.preview) URL.revokeObjectURL(f.preview)
  pendingFiles.value.splice(i, 1)
}

function formatSize(bytes) {
  if (bytes < 1024)            return `${bytes} B`
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function uploadFile(f) {
  const fd    = new FormData()
  fd.append('file', f.file)
  const token = tokenStorage.getAccess()
  const res   = await fetch('/api/upload', {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    fd,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return res.json()
}

// ── Send ───────────────────────────────────────────────────────────────────
async function send() {
  const content = draft.value.trim()
  if (!content && !pendingFiles.value.length) return

  let attachment = []
  if (pendingFiles.value.length) {
    uploading.value = true
    try {
      attachment = await Promise.all(pendingFiles.value.map(uploadFile))
    } catch (err) {
      console.error('Upload error', err)
      uploading.value = false
      return
    }
    uploading.value = false
    pendingFiles.value.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    pendingFiles.value = []
  }

  emit('send', { content, attachment })
  draft.value = ''
}
</script>

<style scoped>
.message-input-wrapper {
  background: rgba(255, 255, 255, 0.04);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.attachment-strip {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.attachment-preview-item {
  position: relative;
  flex-shrink: 0;
}

.attachment-thumb {
  width: 72px;
  height: 72px;
  border-radius: 8px;
}

.attachment-file-card {
  width: 150px;
  height: 52px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  overflow: hidden;
}

.file-name {
  max-width: 110px;
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
}

.emoji-dialog-card {
  background: #1e272e;
}
</style>
