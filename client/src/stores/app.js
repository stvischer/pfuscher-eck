import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../composables/useApi.js'

export const useAppStore = defineStore('app', () => {
  const countries = ref([])
  const skills    = ref([])   // tree: [{ id, name, slug, children: [...] }]
  const loaded    = ref(false)
  const loading   = ref(false)
  const error     = ref(null)

  // Flat list of all skills (parents + children) — useful for search/select
  const skillsFlat = computed(() => {
    const flat = []
    for (const parent of skills.value) {
      flat.push(parent)
      for (const child of parent.children ?? []) {
        flat.push(child)
      }
    }
    return flat
  })

  // Map from iso2 → country — useful for quick lookups
  const countryByIso2 = computed(() =>
    Object.fromEntries(countries.value.map(c => [c.iso2, c])),
  )

  async function fetchConfig() {
    if (loaded.value || loading.value) return
    loading.value = true
    error.value   = null
    try {
      const data  = await api.get('/config')
      countries.value = data.countries
      skills.value    = data.skills
      loaded.value    = true
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    countries,
    skills,
    skillsFlat,
    countryByIso2,
    loaded,
    loading,
    error,
    fetchConfig,
  }
})
