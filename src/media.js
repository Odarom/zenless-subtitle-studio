import { MessageReferenceType } from 'discord.js';
import { UserError } from './config.js';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function imageAttachments(message) {
  const parts = message.reference?.type === MessageReferenceType.Forward
    ? [...(message.messageSnapshots?.values() ?? [])] : [message];
  const unique = new Map();
  for (const part of parts) {
    for (const file of part.attachments?.values() ?? []) {
      if (/^image\//i.test(file.contentType ?? '') || (!file.contentType && /\.(?:png|jpe?g|gif|webp|avif)$/i.test(file.name ?? ''))) unique.set(file.id, file);
    }
  }
  return [...unique.values()];
}

export function imageRevision(message) {
  return JSON.stringify(imageAttachments(message).map(file => [file.id, file.name, file.size]));
}

export async function downloadImages(images, fetcher = fetch) {
  if (images.length > 10 || images.reduce((n, file) => n + (file.size ?? 0), 0) > MAX_IMAGE_BYTES) throw new UserError('이미지는 메시지당 최대 10개, 합계 10MB까지 전달할 수 있습니다.');
  const signal = AbortSignal.timeout(15000);
  const files = [];
  let total = 0;
  for (const image of images) {
    let url;
    try {
      url = new URL(image.url);
      if (url.protocol !== 'https:' || !['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname) || !url.pathname.startsWith('/attachments/') || url.username || url.password) throw new Error();
    } catch { throw new UserError('Discord에 업로드된 이미지만 전달할 수 있습니다.'); }
    let response;
    try { response = await fetcher(url.href, { redirect: 'error', signal }); }
    catch { throw new UserError('이미지를 읽지 못했습니다. 연결을 확인한 뒤 다시 보내주세요.'); }
    if (!response.ok || !response.body) throw new UserError('이미지를 읽지 못했습니다. 이미지가 삭제되었거나 주소가 만료되었을 수 있습니다.');
    if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES - total) {
      await response.body.cancel();
      throw new UserError('이미지는 메시지당 합계 10MB까지 전달할 수 있습니다.');
    }
    const buffers = [];
    try {
      for await (const chunk of response.body) {
        total += chunk.byteLength;
        if (total > MAX_IMAGE_BYTES) throw new UserError('이미지는 메시지당 합계 10MB까지 전달할 수 있습니다.');
        buffers.push(Buffer.from(chunk));
      }
    } catch (error) {
      if (error instanceof UserError) throw error;
      throw new UserError('이미지 다운로드가 지연되거나 끊겼습니다. 다시 보내주세요.');
    }
    if (!buffers.length) throw new UserError('비어 있는 이미지는 전달할 수 없습니다.');
    const name = (image.name || 'image.png').replace(/[\\/\r\n\u0000-\u001f]/g, '_').slice(0, 150);
    files.push({ attachment: Buffer.concat(buffers), name });
  }
  return files;
}
