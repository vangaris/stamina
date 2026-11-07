/** Whether the suggestions have been read. They are optional: a failed read shows no card. */
export enum AdaptationLoadStatus {
  Loading = 'loading',
  Ready = 'ready',
  Unavailable = 'unavailable',
}
