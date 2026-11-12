#!/usr/bin/env node
// Combine separately captured local Docker images. This does not authenticate
// registry publication, signed OCI provenance, deployment or legal permissions.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha256 = b => createHash('sha256').update(b).digest('hex');
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const IMAGE = /^[a-zA-Z0-9][a-zA-Z0-9._/:-]*$/;
const safePath = p => typeof p === 'string' && p.length > 0 && p.length <= 512 &&
  !p.startsWith('/') && !p.includes('\\') && !/[\u0000-\u001f\u007f]/.test(p) &&
  p.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
const keysExactly = (obj, keys) => obj && typeof obj === 'object' &&
  !Array.isArray(obj) && Object.keys(obj).sort().join(',') === keys.sort().join(',');

function checkedCapture(input, expectedEdition) {
  if (!keysExactly(input, ['schema','commercialApproval','images']) ||
      input.schema !== 'therabridge-com02-release-file-evidence-v1' ||
      input.commercialApproval !== false || !Array.isArray(input.images) ||
      input.images.length !== 1) throw Error('INVALID_CAPTURE_ENVELOPE');
  const im = input.images[0];
  if (!keysExactly(im, ['edition','imageRef','ociDigest','filesystemCaptureStatus',
    'releaseApproval','files','captureLimitations']) ||
      im.edition !== expectedEdition || !DIGEST.test(im.ociDigest) ||
      typeof im.imageRef !== 'string' || im.imageRef.length > 200 ||
      !IMAGE.test(im.imageRef) ||
      im.filesystemCaptureStatus !== 'UNATTESTED_CANDIDATE' ||
      im.releaseApproval !== false || !Array.isArray(im.files) ||
      im.files.length > 100000) throw Error('INVALID_IMAGE_CAPTURE');
  const c = im.captureLimitations;
  if (!keysExactly(c, ['source','nonRegularEntriesOmitted',
    'volumesAndRuntimeMountsNotIncluded','independentSignatureVerified','commercialApproval']) ||
      c.source !== 'LOCAL_DOCKER_EXPORT_NOT_DEPLOYMENT_ATTESTATION' ||
      c.volumesAndRuntimeMountsNotIncluded !== true ||
      c.independentSignatureVerified !== false || c.commercialApproval !== false ||
      !keysExactly(c.nonRegularEntriesOmitted,
        ['symlinks','hardlinks','directories','other']) ||
      !Object.values(c.nonRegularEntriesOmitted).every(v =>
        Number.isSafeInteger(v) && v >= 0)) throw Error('FORGED_CAPTURE_AUTHORITY');
  const seen = new Set();
  let total = 0;
  for (const f of im.files) {
    if (!keysExactly(f,['path','sha256','bytes']) || !safePath(f.path) ||
        seen.has(f.path) || typeof f.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(f.sha256) ||
        !Number.isSafeInteger(f.bytes) || f.bytes < 0 ||
        f.bytes > 512 * 1024 * 1024) throw Error('UNSAFE_CAPTURE_FILE');
    seen.add(f.path);
    total += f.bytes;
    if (total > 4 * 1024 * 1024 * 1024) throw Error('CAPTURE_SIZE_BUDGET');
  }
  // Canonical byte-for-byte meaning, independent of JSON presentation order.
  const files = [...im.files].sort((a,b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { ...im, files };
}

function mergeCaptures(saas, enterprise) {
  const images = [checkedCapture(saas,'SAAS'),checkedCapture(enterprise,'ENTERPRISE')];
  const captures = images.map(im => ({
    edition: im.edition,
    imageRef: im.imageRef,
    ociDigest: im.ociDigest,
    fileCount: im.files.length,
    fileInventorySha256: sha256(JSON.stringify(im.files)),
    scope: 'LOCAL_DOCKER_EXPORT_UNATTESTED'
  }));
  return {
    schema:'therabridge-com02-release-file-evidence-v1',
    commercialApproval:false,
    images,
    captureSummary:{
      schema:'therabridge-com02-unattested-capture-summary-v1',
      independentlyVerifiedReleaseImages:0,
      finalNoticesIssued:false,
      commercialLicenseGranted:false,
      captures
    }
  };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const paths = process.argv.slice(2);
  if (paths.length !== 3 || new Set(paths).size !== 3) {
    console.error('Usage: merge-release-captures.mjs saas.json enterprise.json new-output.json');
    process.exit(2);
  }
  try {
    const load = path => {
      if (statSync(path).size > 32 * 1024 * 1024) throw Error('INPUT_BUDGET');
      return JSON.parse(readFileSync(path,'utf8'));
    };
    const combined = mergeCaptures(load(paths[0]),load(paths[1]));
    writeFileSync(paths[2],JSON.stringify(combined,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify(combined.captureSummary));
  } catch (error) {
    console.error(error.message);
    process.exitCode=1;
  }
}
export { mergeCaptures, checkedCapture };
