import { getHealth } from '@stamina/app-core';
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { useMediator } from '../mediator.ts';
import { useHealthStore } from '../stores/health.ts';

export function useApiHealth() {
  const { state } = storeToRefs(useHealthStore());
  const mediator = useMediator();
  onMounted(() => void mediator.send(getHealth()));
  return { state };
}
