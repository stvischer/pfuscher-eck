<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-subtitle1 text-weight-medium q-mb-xs">Address</div>
      <div class="text-caption text-grey q-mb-md">Your physical or mailing address.</div>

      <!-- Autocomplete + map button -->
      <div class="q-mb-md">
        <div class="text-caption text-weight-medium q-mb-xs">Search address</div>
        <div v-if="!apiKey" class="text-caption text-negative q-mb-sm">
          Set <code>VITE_GEOAPIFY_API_KEY</code> in client/.env to enable address autocomplete.
        </div>
        <div class="address__search-bar row items-center no-wrap">
          <div ref="geocoderEl" class="address__geocoder col" />
          <q-btn
            flat round dense
            icon="map"
            color="primary"
            class="q-ml-xs"
            title="Pick location on map"
            @click="openMap"
          />
        </div>
      </div>

      <q-separator class="q-mb-md" />

      <!-- Manual fields -->
      <div class="q-gutter-y-sm">
        <q-input v-model="form.street" label="Street &amp; number" outlined dense />
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-input v-model="form.postalCode" label="Postal code" outlined dense />
          </div>
          <div class="col-12 col-sm-8">
            <q-input v-model="form.city" label="City" outlined dense />
          </div>
        </div>
        <q-input v-model="form.state" label="State / Region" outlined dense />
        <q-select
          v-model="form.country"
          label="Country"
          :options="countryOptions"
          outlined dense
          clearable
          use-input
          input-debounce="0"
          @filter="filterCountries"
        />
      </div>
    </q-card-section>
  </q-card>

  <!-- ── Map dialog ──────────────────────────────────────────────────── -->
  <q-dialog v-model="mapOpen" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="column no-wrap" style="height:100%">

      <!-- toolbar -->
      <q-toolbar class="bg-primary text-white">
        <q-toolbar-title>Pick a location</q-toolbar-title>
        <q-btn
          flat round dense
          icon="my_location"
          :loading="locating"
          title="Use my current location"
          @click="useMyLocation"
        />
        <q-btn flat round dense icon="close" @click="mapOpen = false" />
      </q-toolbar>

      <!-- hint -->
      <div class="text-caption text-grey q-px-md q-pt-sm q-pb-xs">
        Tap anywhere on the map to pick an address.
      </div>

      <!-- map -->
      <div ref="mapEl" class="col" style="min-height:0" />

      <!-- preview bar -->
      <q-card-section v-if="mapPreview" class="q-pa-sm bg-dark row items-center no-wrap">
        <div class="col q-pr-sm">
          <div class="text-body2 text-white ellipsis">{{ mapPreview.label }}</div>
          <div class="text-caption text-grey">{{ [mapPreview.postalCode, mapPreview.city, mapPreview.country].filter(Boolean).join(', ') }}</div>
        </div>
        <q-btn
          unelevated
          color="primary"
          label="Use this address"
          :loading="reverseLoading"
          @click="confirmMapSelection"
        />
      </q-card-section>
      <q-card-section v-else-if="reverseLoading" class="q-pa-sm bg-dark row items-center justify-center">
        <q-spinner color="primary" size="sm" class="q-mr-sm" />
        <span class="text-caption text-grey">Looking up address...</span>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete'
import '@geoapify/geocoder-autocomplete/styles/minimal.css'
import '../../styles/address.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useAuthStore } from '../../stores/auth.js'

// Fix Leaflet default marker icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
})
const emit = defineEmits(['update:modelValue'])

const $q   = useQuasar()
const auth = useAuthStore()

const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY ?? ''

// ── Form state ────────────────────────────────────────────────────────────

const _init = props.modelValue ?? auth.user ?? {}

const form = reactive({
  street:     _init.street     ?? '',
  postalCode: _init.postalCode ?? '',
  city:       _init.city       ?? '',
  state:      _init.state      ?? '',
  country:    _init.country    ?? '',
  lat:        _init.lat        ?? null,
  lon:        _init.lon        ?? null,
})

// Emit to parent whenever any field changes
watch(form, (val) => emit('update:modelValue', { ...val }), { deep: true })

// Sync from parent (controlled usage)
watch(() => props.modelValue, (val) => {
  if (!val) return
  Object.keys(form).forEach(k => { if (Object.prototype.hasOwnProperty.call(val, k)) form[k] = val[k] })
}, { deep: true })

const locating = ref(false)

// ── Geoapify autocomplete ─────────────────────────────────────────────────

const geocoderEl = ref(null)
let autocomplete = null

onMounted(() => {
  if (!apiKey || !geocoderEl.value) return
  autocomplete = new GeocoderAutocomplete(geocoderEl.value, apiKey, {
    placeholder: 'Search for an address...',
    debounceDelay: 300,
    type: 'amenity',
  })
  autocomplete.on('select', (feature) => {
    if (!feature) return
    const p = feature.properties
    applyResult({
      street:     [p.housenumber, p.street].filter(Boolean).join(' '),
      postalCode: p.postcode ?? '',
      city:       p.city ?? p.town ?? p.village ?? '',
      state:      p.state ?? p.county ?? '',
      country:    p.country ?? '',
      lat:        p.lat ?? null,
      lon:        p.lon ?? null,
    })
  })
})

onBeforeUnmount(() => {
  autocomplete = null
  destroyMap()
})

// ── Map dialog ────────────────────────────────────────────────────────────

const mapOpen       = ref(false)
const mapEl         = ref(null)
const mapPreview    = ref(null)
const reverseLoading = ref(false)

let leafletMap   = null
let clickMarker  = null

async function openMap() {
  mapPreview.value = null
  mapOpen.value    = true
  await nextTick()
  await nextTick() // two ticks ensure the maximized dialog has rendered
  initMap()
}

async function initMap() {
  if (!mapEl.value) return
  destroyMap()

  // Default center: use current country/city if available, else world view
  let center = [20, 10]
  let zoom   = 2

  const hint = [form.city, form.country].filter(Boolean).join(', ')
  if (hint) {
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(hint)}&limit=1&apiKey=${apiKey}`,
      )
      const data = await res.json()
      const feat = data.features?.[0]
      if (feat) {
        center = [feat.properties.lat, feat.properties.lon]
        zoom   = form.city ? 13 : 5
      }
    } catch { /* fall back to world view */ }
  }

  leafletMap = L.map(mapEl.value, { zoomControl: true }).setView(center, zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(leafletMap)

  leafletMap.on('click', async (e) => {
    const { lat, lng } = e.latlng
    placeMarker(lat, lng)
    await reverseGeocode(lat, lng)
  })

  // Trigger a resize so all tiles render correctly inside the dialog
  setTimeout(() => leafletMap?.invalidateSize(), 100)
}

function placeMarker(lat, lng) {
  if (clickMarker) {
    clickMarker.setLatLng([lat, lng])
  } else {
    clickMarker = L.marker([lat, lng]).addTo(leafletMap)
  }
}

async function reverseGeocode(lat, lon) {
  reverseLoading.value = true
  mapPreview.value     = null
  try {
    const res  = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`,
    )
    const data = await res.json()
    const p    = data.features?.[0]?.properties
    if (!p) throw new Error('No result')
    mapPreview.value = {
      label:      p.formatted ?? '',
      street:     [p.housenumber, p.street].filter(Boolean).join(' '),
      postalCode: p.postcode  ?? '',
      city:       p.city ?? p.town ?? p.village ?? '',
      state:      p.state ?? p.county ?? '',
      country:    p.country ?? '',
      lat:        p.lat  ?? lat,
      lon:        p.lon  ?? lon,
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Could not look up address', position: 'top' })
  } finally {
    reverseLoading.value = false
  }
}

function confirmMapSelection() {
  if (!mapPreview.value) return
  applyResult({
    street:     mapPreview.value.street     ?? '',
    postalCode: mapPreview.value.postalCode ?? '',
    city:       mapPreview.value.city       ?? '',
    state:      mapPreview.value.state      ?? '',
    country:    mapPreview.value.country    ?? '',
    lat:        mapPreview.value.lat        ?? null,
    lon:        mapPreview.value.lon        ?? null,
  })
  mapOpen.value = false
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    $q.notify({ type: 'warning', message: 'Geolocation not supported by your browser', position: 'top' })
    return
  }
  locating.value = true
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
    )
    const { latitude: lat, longitude: lon } = pos.coords
    if (leafletMap) {
      leafletMap.setView([lat, lon], 16)
      placeMarker(lat, lon)
    }
    await reverseGeocode(lat, lon)
  } catch (err) {
    $q.notify({
      type:    'negative',
      message: err.code === 1 ? 'Location access denied' : (err.message ?? 'Could not detect location'),
      position: 'top',
    })
  } finally {
    locating.value = false
  }
}

function destroyMap() {
  if (leafletMap) { leafletMap.remove(); leafletMap = null }
  clickMarker = null
}

// Re-init map every time the dialog opens
watch(mapOpen, (val) => { if (!val) destroyMap() })

// ── Apply result ──────────────────────────────────────────────────────────

function applyResult({ street, postalCode, city, state, country, lat = null, lon = null }) {
  form.street     = street
  form.postalCode = postalCode
  form.city       = city
  form.state      = state
  form.country    = ALL_COUNTRIES.includes(country) ? country : (country || form.country)
  form.lat        = lat
  form.lon        = lon
}

defineExpose({ form })

// ── Country filter ────────────────────────────────────────────────────────

const ALL_COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Belarus','Belgium','Belize',
  'Benin','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
  'Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Chad','Chile','China',
  'Colombia','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark',
  'Dominican Republic','Ecuador','Egypt','El Salvador','Ethiopia','Finland','France',
  'Georgia','Germany','Ghana','Greece','Guatemala','Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica',
  'Japan','Jordan','Kazakhstan','Kenya','Kuwait','Laos','Latvia','Lebanon','Libya',
  'Liechtenstein','Lithuania','Luxembourg','Madagascar','Malaysia','Mali','Malta',
  'Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Macedonia',
  'Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland',
  'Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia',
  'Singapore','Slovakia','Slovenia','Somalia','South Africa','South Korea','Spain',
  'Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand',
  'Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
]

const countryOptions = ref(ALL_COUNTRIES.slice(0, 30))

function filterCountries(val, update) {
  update(() => {
    const q = val.toLowerCase()
    countryOptions.value = q
      ? ALL_COUNTRIES.filter(c => c.toLowerCase().includes(q))
      : ALL_COUNTRIES.slice(0, 30)
  })
}
</script>


