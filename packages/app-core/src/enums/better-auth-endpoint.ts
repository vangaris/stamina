/** Better Auth REST paths, relative to the auth URL. Unverified against live Neon Auth. */
export enum BetterAuthEndpoint {
  SendEmailCode = '/email-otp/send-verification-otp',
  VerifyEmailCode = '/sign-in/email-otp',
  Token = '/token',
  Session = '/get-session',
  SocialSignIn = '/sign-in/social',
  SignOut = '/sign-out',
}
