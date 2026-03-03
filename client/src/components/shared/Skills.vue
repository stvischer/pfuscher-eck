<template>
  <div>
    <!-- Selected chips -->
    <div v-if="selected.length" class="q-mb-md q-gutter-xs">
      <q-chip
        v-for="s in selected"
        :key="s.id"
        removable
        color="primary"
        text-color="white"
        dense
        @remove="removeById(s.id)"
      >
        {{ s.name }}
      </q-chip>
    </div>

    <!-- Search -->
    <q-input
      v-model="search"
      outlined dense clearable
      placeholder="Fähigkeiten suchen…"
      class="q-mb-sm"
    >
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <!-- Tree -->
    <div v-if="app.loading" class="text-center q-pa-md">
      <q-spinner color="primary" size="sm" />
    </div>
    <div v-else-if="visibleTree.length === 0" class="text-caption text-grey q-pa-sm">
      Keine Fähigkeiten gefunden.
    </div>
    <q-tree
      v-else
      :nodes="visibleTree"
      node-key="id"
      label-key="name"
      tick-strategy="leaf"
      v-model:ticked="tickedIds"
      v-model:expanded="expandedIds"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/app.js'
import { useAuthStore } from '../../stores/auth.js'

const props = defineProps({
  /** v-model: [{ skillId, level }] */
  modelValue: { type: Array, default: null },
  /** When set, only the root skill with this id is shown in the tree */
  rootId: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue'])

const app  = useAppStore()
const auth = useAuthStore()

// ── Selection state ───────────────────────────────────────────────────────
// Internal: [{ id, name, slug, level }]
const selected = ref([])

// ── Settings interface ────────────────────────────────────────────────────
function _snap() {
  return JSON.stringify(selected.value.map(s => `${s.id}:${s.level ?? 'beginner'}`).sort())
}
const snapshot = ref('[]')
const isDirty  = computed(() => _snap() !== snapshot.value)

function _toInternal(skillRef) {
  // skillRef is either a flat skill from skillsFlat or a {skillId, level} API object
  if (!skillRef) return null
  const id = skillRef.skillId ?? skillRef.id
  const found = app.skillsFlat.find(s => s.id === id)
  return found ? { ...found, level: skillRef.level ?? 'beginner' } : null
}

// Initialise from modelValue or auth.user.skills, whichever is provided
function initSelected() {
  const source = props.modelValue ?? auth.user?.skills ?? []
  selected.value = source.map(_toInternal).filter(Boolean)
  snapshot.value = _snap()
}

// Re-init when app config finishes loading (skills may not be ready yet on mount)
watch(() => app.loaded, (ready) => { if (ready) initSelected() }, { immediate: true })

// Sync from parent (controlled mode)
watch(() => props.modelValue, () => { if (app.loaded) initSelected() }, { deep: true })

// Emit upward on every change
watch(selected, (val) => {
  emit('update:modelValue', val.map(s => ({ skillId: s.id, level: s.level ?? 'beginner' })))
}, { deep: true })

// ── q-tree bindings ───────────────────────────────────────────────────────
// tickedIds is the v-model:ticked for q-tree (array of leaf node IDs)
const tickedIds = computed({
  get: () => selected.value.map(s => s.id),
  set: (ids) => {
    const prev = new Map(selected.value.map(s => [s.id, s]))
    selected.value = ids
      .map(id => {
        const flat = app.skillsFlat.find(s => s.id === id)
        return flat ? (prev.get(id) ?? { ...flat, level: 'beginner' }) : null
      })
      .filter(Boolean)
  },
})

function removeById(id) {
  selected.value = selected.value.filter(s => s.id !== id)
}

// ── Search filter ─────────────────────────────────────────────────────────
const search = ref('')

const visibleTree = computed(() => {
  const roots = props.rootId
    ? app.skills.filter(p => p.id === props.rootId)
    : app.skills
  const q = search.value.trim().toLowerCase()
  if (!q) return roots

  return roots
    .map(parent => {
      const matchesParent = parent.name.toLowerCase().includes(q)
      const filteredChildren = matchesParent
        ? parent.children
        : parent.children.filter(c => c.name.toLowerCase().includes(q))
      return filteredChildren.length ? { ...parent, children: filteredChildren } : null
    })
    .filter(Boolean)
})

// Expand parents that contain selected children; expand all when a search is active
const selectedIds = computed(() => new Set(selected.value.map(s => s.id)))
const expandedIds = ref([])

function _updateExpanded() {
  expandedIds.value = visibleTree.value
    .filter(p => search.value.trim() || p.children.some(c => selectedIds.value.has(c.id)))
    .map(p => p.id)
}

watch([selectedIds, visibleTree], _updateExpanded, { immediate: true })

function getFields() {
  return {
    skills: selected.value.map(s => ({ skillId: s.id, level: s.level ?? 'beginner' })),
  }
}

function resetSnapshot() {
  snapshot.value = _snap()
}

defineExpose({ getFields, isDirty, resetSnapshot })
</script>
