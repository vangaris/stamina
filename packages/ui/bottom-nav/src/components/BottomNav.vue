<script setup lang="ts">
import { BOTTOM_NAV_ACTIVE_CLASSES, BOTTOM_NAV_INACTIVE_CLASSES } from '../config.ts';
import type { BottomNavProps } from '../types.ts';

defineProps<BottomNavProps>();

const emit = defineEmits<{ select: [id: string] }>();
</script>

<template>
  <nav
    :aria-label="label"
    class="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
  >
    <ul class="mx-auto flex max-w-md">
      <li v-for="item in items" :key="item.id" class="flex-1">
        <a
          :href="item.href"
          :aria-current="item.id === activeId ? 'page' : undefined"
          class="flex min-h-tap min-w-tap flex-col items-center justify-center gap-1 border-t-2 px-2 py-2 text-xs font-medium transition-colors focus-ring-inset"
          :class="item.id === activeId ? BOTTOM_NAV_ACTIVE_CLASSES : BOTTOM_NAV_INACTIVE_CLASSES"
          @click.prevent="emit('select', item.id)"
        >
          <span>{{ item.label }}</span>
        </a>
      </li>
    </ul>
  </nav>
</template>
