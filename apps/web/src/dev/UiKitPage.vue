<script setup lang="ts">
// Developer-only: every UI kit component in both themes. Not localised and not routed in
// production builds (see router.ts). To add a component, drop `<Name>Demo.vue` into ./demos.
import { markRaw, type Component } from 'vue';
import { Theme } from './enums/theme.ts';

const modules = import.meta.glob<{ default: Component }>('./demos/*Demo.vue', { eager: true });
const demos = Object.entries(modules)
  .map(([path, mod]) => ({
    name: /\/(\w+)Demo\.vue$/.exec(path)?.[1] ?? path,
    component: markRaw(mod.default),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Each theme is scoped to its own container, so both render side by side regardless of the phone.
const themes = Object.values(Theme);
</script>

<template>
  <section data-testid="ui-kit">
    <h1 class="text-xl font-semibold">UI kit</h1>
    <div
      v-for="theme in themes"
      :key="theme"
      :data-theme="theme"
      :data-testid="`theme-${theme}`"
      class="mt-4 rounded-lg border border-border bg-bg p-4 text-text"
    >
      <h2 class="text-lg font-semibold">{{ theme }} theme</h2>
      <div v-for="demo in demos" :key="demo.name" :data-demo="demo.name" class="mt-6">
        <h3 class="mb-2 text-sm font-semibold text-text-muted">{{ demo.name }}</h3>
        <component :is="demo.component" />
      </div>
    </div>
  </section>
</template>
