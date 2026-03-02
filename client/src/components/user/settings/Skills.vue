<template>
  <q-card flat>
    <q-card-section>
      <div class="text-subtitle1 text-weight-medium q-mb-xs">Skills &amp; Expertise</div>
      <div class="text-caption text-grey q-mb-md">
        Add skills that describe what you do. Press <kbd>Enter</kbd> or <kbd>,</kbd> to add a new one.
      </div>

      <q-form @submit.prevent="save" class="q-gutter-y-sm">
        <q-select
          v-model="skills"
          label="Skills"
          outlined
          use-input
          use-chips
          multiple
          hide-dropdown-icon
          input-debounce="0"
          :options="suggestions"
          @filter="filterSkills"
          @new-value="addSkill"
          hint="Type and press Enter or comma to add"
        >
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">Press Enter to add this skill</q-item-section>
            </q-item>
          </template>
        </q-select>

      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../../../stores/auth.js'

const auth = useAuthStore()

const ALL_SKILLS = [
  'JavaScript','TypeScript','Vue.js','React','Node.js','Python','Java','C#','PHP','Go',
  'Rust','Swift','Kotlin','SQL','MariaDB','PostgreSQL','MongoDB','Redis','Docker',
  'Kubernetes','AWS','Azure','GCP','Linux','Git','CI/CD','REST API','GraphQL','HTML',
  'CSS','SASS','Tailwind','Bootstrap','Quasar','Figma','Photoshop','UX Design',
  'Project Management','Scrum','Agile','DevOps','Security','Networking','Plumbing',
  'Electrical','Carpentry','Welding','HVAC','Renovation','Painting','Tiling','Roofing',
]

const skills      = ref(Array.isArray(auth.user?.skills) ? [...auth.user.skills] : [])
const suggestions = ref(ALL_SKILLS.slice(0, 20))
function _snap() { return JSON.stringify([...skills.value].sort()) }
const snapshot = ref(_snap())
const isDirty  = computed(() => _snap() !== snapshot.value)

function filterSkills(val, update) {
  update(() => {
    const q = val.toLowerCase()
    suggestions.value = q
      ? ALL_SKILLS.filter(s => s.toLowerCase().includes(q) && !skills.value.includes(s))
      : ALL_SKILLS.filter(s => !skills.value.includes(s)).slice(0, 20)
  })
}

function addSkill(val, done) {
  const trimmed = val.trim().replace(/,+$/, '')
  if (trimmed && !skills.value.includes(trimmed)) {
    done(trimmed, 'add-unique')
  } else {
    done()
  }
}

function getFields() {
  return { skills: skills.value }
}

function resetSnapshot() {
  snapshot.value = _snap()
}

defineExpose({ getFields, resetSnapshot, isDirty })
</script>
