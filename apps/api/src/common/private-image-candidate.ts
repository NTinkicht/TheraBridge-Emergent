import { createConnection } from 'node:net';
import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { verifyPngCandidate } from '../clinical/activity-media-png-integrity';
import { sealPrivateData } from './private-envelope';

// The global Fastify JSON body limit is 1 MiB. Do not raise it for other routes.
// The 512 KiB cap leaves room for base64 and metadata while controlling memory.
export const MAX_PRIVATE_IMAGE_BYTES = 512 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_PRIVATE_IMAGE_BYTES / 3) * 4;
export type PreparedImage = {
  encryptedBytes: Buffer; digestSha256: string; width: number; height: number;
  scannerName: string; scannerVersion: string;
};

export function decodePrivatePng(input: unknown): Buffer {
  if (typeof input !== 'string' || input.length < 44 || input.length > MAX_BASE64_LENGTH ||
      input.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input)) {
    throw new UnprocessableEntityException('Private PNG candidate invalid.');
  }
  const decoded = Buffer.from(input,'base64');
  if (decoded.length === 0 || decoded.length > MAX_PRIVATE_IMAGE_BYTES ||
      decoded.toString('base64') !== input) {
    throw new UnprocessableEntityException('Private PNG candidate invalid.');
  }
  return decoded;
}

// Ask the trusted local ClamAV daemon directly; no client-controlled scan
// verdicts, no network addresses, and fail-closed on missing daemon.
async function clamd(command: Buffer): Promise<string> {
  const socketPath=process.env.TB_MEDIA_CLAMD_SOCKET;
  if (!socketPath || !/^\/(?:run|var\/run)\/clamav\/[A-Za-z0-9._-]{1,80}$/.test(socketPath)) {
    throw new ServiceUnavailableException('Private image scanner is unavailable.');
  }
  return new Promise((resolve,reject)=>{
    const socket=createConnection({path:socketPath});
    let result=''; let settled=false;
    const abort=()=>{if(!settled){settled=true;socket.destroy();reject(new ServiceUnavailableException('Private image scanner is unavailable.'));}};
    socket.setTimeout(15000,abort);
    socket.on('error',abort);
    socket.on('data',part=>{result+=part.toString('utf8');if(result.length>512)abort();});
    socket.on('end',()=>{
      if(settled)return;settled=true;
      resolve(result.replace(/\0/g,'').trim());
    });
    socket.on('connect',()=>socket.end(command));
  });
}
async function scanPrivatePng(bytes: Buffer) {
  const length=Buffer.alloc(4);length.writeUInt32BE(bytes.length,0);
  const response=await clamd(Buffer.concat([Buffer.from('zINSTREAM\0'),length,bytes,Buffer.alloc(4)]));
  if (response !== 'stream: OK') throw new UnprocessableEntityException('Private PNG candidate was rejected by security scanning.');
  const version=await clamd(Buffer.from('zVERSION\0'));
  if (!/^ClamAV [A-Za-z0-9.\/-]{3,40}/.test(version)) {
    throw new ServiceUnavailableException('Private image scanner version unavailable.');
  }
  return version.split(/\s+/)[1].replace(/[^A-Za-z0-9._-]/g,'').slice(0,60);
}
export async function preparePrivatePng(
  input: unknown, domain:'child-photo-v1'|'activity-image-v1',
  centerId: string, subjectId: string,
): Promise<PreparedImage> {
  const bytes=decodePrivatePng(input);
  const verified=verifyPngCandidate(bytes); // exact PNG structure, CRC, bounded inflate; rejects EXIF/tEXt/iTXt.
  const scannerVersion=await scanPrivatePng(bytes);
  // Only server-held key can place a verified candidate in the private database.
  const encryptedBytes=sealPrivateData(bytes,domain,centerId,subjectId);
  return { encryptedBytes,digestSha256:verified.sha256,width:verified.width,height:verified.height,
    scannerName:'ClamAV',scannerVersion };
}
