<template>
  <div v-if="auth.user?.address" class="row items-center q-gutter-x-sm">
    <q-toggle
      :model-value="auth.user.address.enabled"
      :label="auth.user.address.enabled ? 'Active' : 'Inactive'"
      :loading="toggling"
      dense
      color="primary"
      @update:model-value="toggleEnabled"
    />
    <q-btn
      flat
      round
      dense
      icon="delete"
      color="negative"
      :loading="deleting"
      title="Delete address"
      @click="confirmDelete"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../../stores/auth.js';

const $q = useQuasar();
const auth = useAuthStore();

const toggling = ref(false);
const deleting = ref(false);

async function toggleEnabled(value) {
  toggling.value = true;
  try {
    await auth.setAddressEnabled(value);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message ?? 'Update failed', position: 'top' });
  } finally {
    toggling.value = false;
  }
}

async function confirmDelete() {
  $q.dialog({
    title: 'Delete address',
    message: 'Are you sure you want to delete your address?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    deleting.value = true;
    try {
      await auth.deleteAddress();
    } catch (err) {
      $q.notify({ type: 'negative', message: err.message ?? 'Delete failed', position: 'top' });
    } finally {
      deleting.value = false;
    }
  });
}
</script>
