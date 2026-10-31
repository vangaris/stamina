import { describe, expect, it } from 'vitest';
import { isEuSentryDsn } from './is-eu-sentry-dsn.ts';

describe('isEuSentryDsn', () => {
  it('accepts an https DSN on the EU region', () => {
    expect(isEuSentryDsn('https://key@o123.ingest.de.sentry.io/456')).toBe(true);
  });

  it('rejects the US region and other hosts', () => {
    expect(isEuSentryDsn('https://key@o123.ingest.us.sentry.io/456')).toBe(false);
    expect(isEuSentryDsn('https://key@o123.ingest.sentry.io/456')).toBe(false);
    expect(isEuSentryDsn('https://key@evil.example/456')).toBe(false);
  });

  it('rejects a lookalike host that only contains the EU suffix mid-name', () => {
    expect(isEuSentryDsn('https://key@de.sentry.io.evil.example/456')).toBe(false);
  });

  it('rejects non-https DSNs', () => {
    expect(isEuSentryDsn('http://key@o123.ingest.de.sentry.io/456')).toBe(false);
  });

  it('rejects strings that are not URLs', () => {
    expect(isEuSentryDsn('')).toBe(false);
    expect(isEuSentryDsn('not a dsn')).toBe(false);
  });
});
