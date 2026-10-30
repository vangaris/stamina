import { z } from 'zod';

const MS_PER_SECOND = 1000;
const payloadSchema = z.object({ exp: z.number().finite() });

/** The `exp` claim of a JWT as epoch milliseconds. Decodes only; never verifies the signature. */
export function readTokenExpiry(token: string): number | undefined {
  const payload = token.split('.')[1];
  if (!payload) return undefined;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)),
    );
    const parsed = payloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data.exp * MS_PER_SECOND : undefined;
  } catch {
    return undefined;
  }
}
