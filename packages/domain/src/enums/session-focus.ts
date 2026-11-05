/** The body half a Session trains heavily; upper and lower heavy work never share a Session. */
export enum SessionFocus {
  Lower = 'lower',
  Upper = 'upper',
  /** Mobility & Recovery: no heavy main strength; placed only where a heavy Session cannot go. */
  Recovery = 'recovery',
}
