import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';

/** AES-256-GCM with context-bound AAD; keys are supplied only by the server. */
function key(): Buffer {
  const encoded = process.env.TB_PRIVATE_DATA_KEY_B64;
  if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
    throw new ServiceUnavailableException('Private-data encryption unavailable.');
  }
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== encoded) {
    throw new ServiceUnavailableException('Private-data encryption unavailable.');
  }
  return decoded;
}
function context(domain: string, centerId: string, subjectId: string): Buffer {
  if (!/^(care-v1|child-photo-v1|activity-image-v1)$/.test(domain) ||
      !/^[a-f0-9-]{36}$/i.test(centerId) || !/^[a-f0-9-]{36}$/i.test(subjectId))
    throw new UnprocessableEntityException('Invalid private data scope.');
  return Buffer.from(domain + ':' + centerId + ':' + subjectId, 'utf8');
}
export function sealPrivateData(plain: Buffer, domain: string, centerId: string, subjectId: string): Buffer {
  if (!Buffer.isBuffer(plain) || plain.length === 0 || plain.length > 9 * 1024 * 1024)
    throw new UnprocessableEntityException('Invalid private data size.');
  const aad = context(domain, centerId, subjectId), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(aad);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), body]);
}
export function openPrivateData(ciphertext: Uint8Array, domain: string, centerId: string, subjectId: string): Buffer {
  if (!(ciphertext instanceof Uint8Array) || ciphertext.length < 30 || ciphertext[0] !== 1)
    throw new UnprocessableEntityException('Private data unavailable.');
  try {
    const bytes = Buffer.from(ciphertext);
    const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(1, 13));
    decipher.setAAD(context(domain, centerId, subjectId));
    decipher.setAuthTag(bytes.subarray(13, 29));
    return Buffer.concat([decipher.update(bytes.subarray(29)), decipher.final()]);
  } catch {
    throw new UnprocessableEntityException('Private data unavailable.');
  }
}
