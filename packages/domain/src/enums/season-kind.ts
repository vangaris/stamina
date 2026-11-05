/** What decides when a sport is played. */
export enum SeasonKind {
  YearRound = 'year-round',
  /** Wind, waves or temperature decide: the listed months are the usual ones. */
  Weather = 'weather',
  /** A league or competition calendar decides: the listed months are the usual ones. */
  League = 'league',
}
