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
    class="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
  >
    <ul class="mx-auto flex max-w-md">
      <li v-for="item in items" :key="item.id" class="flex-1">
        <a
          :href="item.href"
          :aria-current="item.id === activeId ? 'page' : undefined"
          class="flex min-h-tap min-w-tap flex-col items-center justify-center gap-1 border-t-2 px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          :class="
            item.id === activeId
              ? 'border-accent font-semibold text-accent'
              : 'border-transparent text-text-muted'
          "
          @click.prevent="emit('select', item.id)"
        >
          <span>{{ item.label }}</span>
        </a>
      </li>
    </ul>
  </nav>
</template>
