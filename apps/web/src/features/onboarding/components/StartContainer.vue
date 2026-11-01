<script setup lang="ts">
import { SessionStatus } from '@stamina/app-core';
import { useRoute, useRouter } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';
import { useSessionStore } from '../../../stores/session.ts';
import { NOTICE_QUERY_KEY } from '../config.ts';
import { useInviteStart } from '../composables/useInviteStart.ts';
import { parseStartNotice } from '../utils/parse-start-notice.ts';
import InviteStep from './InviteStep.vue';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const { code, errorKey, noticeKey, busy, setCode, submit } = useInviteStart({
  // Signed-in people (sent back here by a rejected invite) skip the sign-in.
  onValid: () =>
    void router.push(
      session.state.status === SessionStatus.SignedIn ? RoutePath.Onboarding : RoutePath.SignIn,
    ),
  notice: parseStartNotice(route.query[NOTICE_QUERY_KEY]),
});
</script>

<template>
  <InviteStep
    :code="code"
    :error-key="errorKey"
    :notice-key="noticeKey"
    :busy="busy"
    @update:code="setCode"
    @submit="submit"
    @sign-in="router.push(RoutePath.SignIn)"
  />
</template>
