<template>
  <router-view :key="routeKey" />
  <UiToast />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/composables/useTheme';
import UiToast from '@/components/ui/UiToast.vue';

const route = useRoute();
const authStore = useAuthStore();
useTheme();

const routeKey = computed(() => route.path + '-' + (authStore.activeTenantId || 'public'));
</script>
