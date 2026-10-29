<script setup lang="ts">
import { BottomNav } from '@stamina/ui-bottom-nav';
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { tabs } from './router.ts';

const route = useRoute();
const router = useRouter();

const items = tabs.map(({ id, label, path }) => ({ id, label, href: path }));
const activeId = computed(() => tabs.find((t) => t.path === route.path)?.id ?? '');

function select(id: string) {
  const tab = tabs.find((t) => t.id === id);
  if (tab) void router.push(tab.path);
}
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-md flex-col bg-white text-neutral-900">
    <main class="flex-1 p-4">
      <RouterView />
    </main>
    <BottomNav :items="items" :active-id="activeId" label="Main" @select="select" />
  </div>
</template>
