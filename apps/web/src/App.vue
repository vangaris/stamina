<script setup lang="ts">
import { BottomNav } from '@stamina/ui-bottom-nav';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { ROUTES_WITHOUT_TABS } from './config.ts';
import { tabs } from './router.ts';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const items = computed(() =>
  tabs.map(({ id, path }) => ({ id, label: t(`nav.${id}`), href: path })),
);
// People who are signed out or still setting up have no tabs to go to yet.
const showTabs = computed(() => !ROUTES_WITHOUT_TABS.some((name) => name === route.name));
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
    <BottomNav
      v-if="showTabs"
      :items="items"
      :active-id="activeId"
      :label="t('nav.label')"
      @select="select"
    />
  </div>
</template>
