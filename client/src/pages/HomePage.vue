<template>
  <q-page padding>
    <div class="row q-col-gutter-md">

      <!-- Welcome card -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-h6">
              <q-icon name="waving_hand" color="primary" class="q-mr-sm" />
              Welcome back, {{ auth.user?.username }}!
            </div>
            <div class="text-caption text-grey q-mt-xs">
              {{ auth.user?.email }} · <span class="text-uppercase">{{ auth.user?.role }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Quick-nav card -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">Quick Navigation</div>
            <q-btn
              unelevated
              color="primary"
              icon="chat"
              label="Go to Chat"
              :to="{ name: 'chat' }"
              class="full-width"
            />
          </q-card-section>
        </q-card>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
</script>
