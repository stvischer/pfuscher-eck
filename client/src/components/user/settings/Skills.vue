<template>
  <q-card flat>
    <q-card-section>
      <div class="text-subtitle1 text-weight-medium q-mb-xs">Fähigkeiten &amp; Expertise</div>
      <div class="text-caption text-grey q-mb-md">
        Wähle deine Fähigkeiten aus den Kategorien unten aus.
      </div>
      <SharedSkills ref="skillsRef" />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import SharedSkills from '../../shared/Skills.vue'

const skillsRef = ref(null)

const isDirty        = computed(() => skillsRef.value?.isDirty ?? false)
function getFields() { return skillsRef.value?.getFields()      ?? { skills: [] } }
function resetSnapshot() { skillsRef.value?.resetSnapshot() }

defineExpose({ getFields, resetSnapshot, isDirty })
</script>
