/** The ways a person leaves the invite screen; the container maps each to a route. */
export enum StartExit {
  /** The code is valid and nobody is signed in: sign in next. */
  SignIn = 'sign-in',
  /** The code is valid and the person is already signed in: straight to the screens. */
  Onboarding = 'onboarding',
}
