/** Who answered an evaluation run. */
export enum EvalProvider {
  Anthropic = 'anthropic',
  /** The offline stand-in used without an API key; it measures no model. */
  Harness = 'harness',
}
