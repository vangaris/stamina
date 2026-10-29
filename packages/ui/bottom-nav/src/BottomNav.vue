<script setup lang="ts">
export interface BottomNavItem {
  id: string;
  label: string;
  href: string;
}

defineProps<{
  items: readonly BottomNavItem[];
  activeId: string;
  label: string;
}>();

const emit = defineEmits<{ select: [id: string] }>();
</script>

<template>
  <nav
    :aria-label="label"
    class="border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]"
  >
    <ul class="mx-auto flex max-w-md">
      <li v-for="item in items" :key="item.id" class="flex-1">
        <a
          :href="item.href"
          :aria-current="item.id === activeId ? 'page' : undefined"
          class="flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 px-2 py-1 text-xs font-medium"
          :class="item.id === activeId ? 'text-indigo-700' : 'text-neutral-700'"
          @click.prevent="emit('select', item.id)"
        >
          <slot name="icon" :item="item" :active="item.id === activeId" />
          <span>{{ item.label }}</span>
        </a>
      </li>
    </ul>
  </nav>
</template>
