<template>
  <div v-if="password" class="pw-strength q-mt-xs">
    <div class="pw-strength__bars row q-gutter-x-xs q-mb-xs">
      <div
        v-for="i in 4"
        :key="i"
        class="pw-strength__bar col"
        :class="i <= score ? `pw-strength__bar--${level}` : 'pw-strength__bar--empty'"
      />
    </div>
    <div class="text-caption" :class="labelColor">{{ label }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  password: { type: String, default: '' },
})

const score = computed(() => {
  const p = props.password
  if (!p) return 0
  let s = 0
  if (p.length >= 8)              s++
  if (p.length >= 12)             s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/[0-9]/.test(p))            s++
  if (/[^A-Za-z0-9]/.test(p))    s++
  return Math.min(4, s)
})

const level = computed(() => ['empty', 'weak', 'fair', 'good', 'strong'][score.value])

const label = computed(() => ['', 'Weak', 'Fair', 'Good', 'Strong'][score.value])

const labelColor = computed(() => ({
  'text-negative': score.value === 1,
  'text-orange':   score.value === 2,
  'text-warning':  score.value === 3,
  'text-positive': score.value === 4,
}))
</script>

<style scoped>
.pw-strength__bars { height: 4px; }

.pw-strength__bar {
  border-radius: 2px;
  height: 4px;
  transition: background-color 0.25s;
}

.pw-strength__bar--empty  { background: #e0e0e0; }
.pw-strength__bar--weak   { background: #f44336; }
.pw-strength__bar--fair   { background: #ff9800; }
.pw-strength__bar--good   { background: #ffeb3b; }
.pw-strength__bar--strong { background: #4caf50; }
</style>
