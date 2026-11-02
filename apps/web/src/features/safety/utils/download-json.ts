import { EXPORT_MIME_TYPE } from '../config.ts';

/** Hands `data` to the browser as a file download. The data never leaves the device. */
export function downloadJson(fileName: string, data: unknown): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: EXPORT_MIME_TYPE }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
