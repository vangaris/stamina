/** The only request headers sent upstream; everything else the browser sent stays here. */
export enum ForwardedHeader {
  Accept = 'accept',
  ContentType = 'content-type',
  Cookie = 'cookie',
  Origin = 'origin',
}
