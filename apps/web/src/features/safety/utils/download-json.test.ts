import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXPORT_FILE_NAME, EXPORT_MIME_TYPE } from '../config.ts';
import { downloadJson } from './download-json.ts';

afterEach(() => vi.unstubAllGlobals());

describe('downloadJson', () => {
  it('clicks a link to the formatted JSON, named as asked, then releases the object URL', async () => {
    const link = { href: '', download: '', click: vi.fn() };
    vi.stubGlobal('document', { createElement: () => link });
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:stamina';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    downloadJson(EXPORT_FILE_NAME, { profile: null });

    expect(link).toMatchObject({ href: 'blob:stamina', download: EXPORT_FILE_NAME });
    expect(link.click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:stamina');
    expect(blob?.type).toBe(EXPORT_MIME_TYPE);
    expect(JSON.parse(await blob!.text())).toEqual({ profile: null });
  });
});
