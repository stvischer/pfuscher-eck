<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-subtitle1 text-weight-medium q-mb-xs">Address</div>
      <div class="text-caption text-grey q-mb-md">Your physical or mailing address.</div>

      <q-form @submit.prevent="save" class="q-gutter-y-sm">
        <q-input
          v-model="form.street"
          label="Street &amp; number"
          outlined dense
        />

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-input v-model="form.postalCode" label="Postal code" outlined dense />
          </div>
          <div class="col-12 col-sm-8">
            <q-input v-model="form.city" label="City" outlined dense />
          </div>
        </div>

        <q-input
          v-model="form.state"
          label="State / Region"
          outlined dense
        />

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

        <div class="row justify-end q-pt-xs">
          <q-btn type="submit" label="Save" color="primary" unelevated :loading="saving" />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../../../stores/auth.js'

const $q   = useQuasar()
const auth = useAuthStore()

const form = reactive({
  street:     auth.user?.street     ?? '',
  postalCode: auth.user?.postalCode ?? '',
  city:       auth.user?.city       ?? '',
  state:      auth.user?.state      ?? '',
  country:    auth.user?.country    ?? '',
})

const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await auth.updateProfile({
      street:     form.street,
      postalCode: form.postalCode,
      city:       form.city,
      state:      form.state,
      country:    form.country,
    })
    $q.notify({ type: 'positive', message: 'Saved', position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Save failed', position: 'top' })
  } finally {
    saving.value = false
  }
}

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
