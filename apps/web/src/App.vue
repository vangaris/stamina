<script setup lang="ts">
import { BottomNav } from '@stamina/ui-bottom-nav';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { tabs } from './router.ts';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const items = computed(() =>
  tabs.map(({ id, path }) => ({ id, label: t(`nav.${id}`), href: path })),
);
const activeId = computed(() => tabs.find((tab) => tab.path === route.path)?.id ?? '');

function select(id: string) {
  const tab = tabs.find((t) => t.id === id);
  if (tab) void router.push(tab.path);
}
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-md flex-col bg-bg text-text">
    <main class="flex-1 p-4">
      <RouterView />
    </main>
    <BottomNav :items="items" :active-id="activeId" :label="t('nav.label')" @select="select" />
  </div>
</template>
