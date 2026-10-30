import type { Mediator } from '@stamina/app-core';
import type { SignInMessageKey } from './enums/sign-in-message-key.ts';

export interface UseSignInOptions {
  /** Called once the code is accepted and the session is signed in. */
  onSignedIn: () => void;
  /** Where the browser lands after the Google round trip (an absolute URL on this origin). */
  callbackUrl: string;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** Leaves the app for another page (Google). Defaults to `location.assign`. */
  redirect?: (url: string) => void;
}

export interface EmailStepProps {
  email: string;
  errorKey?: SignInMessageKey | undefined;
  busy: boolean;
}

export interface EmailStepEmits {
  'update:email': [email: string];
  submit: [];
  google: [];
}

export interface CodeStepProps {
  email: string;
  code: string;
  errorKey?: SignInMessageKey | undefined;
  noticeKey?: SignInMessageKey | undefined;
  busy: boolean;
  /** Seconds until a new code can be requested; 0 when it can be requested now. */
  resendSeconds: number;
}

export interface CodeStepEmits {
  'update:code': [code: string];
  submit: [];
  resend: [];
  back: [];
}

export interface CooldownOptions {
  seconds: number;
  tickMs: number;
}
