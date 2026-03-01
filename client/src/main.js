import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'
import './styles/main.css'
import App from './App.vue'
import router from './router/index.js'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(Quasar, { plugins: {} })
  .mount('#app')
