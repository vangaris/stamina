/** The `stop_reason` values the adapter acts on; any other value means the answer is complete. */
export enum AnthropicStopReason {
  Refusal = 'refusal',
  MaxTokens = 'max_tokens',
}
