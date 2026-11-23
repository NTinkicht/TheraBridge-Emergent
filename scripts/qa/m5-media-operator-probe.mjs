/**
 * M5-14 local OPERATOR-only runtime probe, never a publication/clinical gate.
 * Run inside the authorized server host; no media bytes, keys or paths are
 * reported. The API already uses the exact TB_PRIVATE_DATA_KEY_B64 and
 * TB_MEDIA_CLAMD_SOCKET variables in its private image intake.
 */
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createConnection} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const SOCKET=/^\/(?:run|var\/run)\/clamav\/[A-Za-z0-9._-]{1,80}$/;
const BASE64=/^[A-Za-z0-9+/]{43}=$/;
export class OperatorProbeError extends Error {constructor(){super('Media runtime probe unavailable.');}}
export async function queryLocalClamd(socketPath,command){
  if(!SOCKET.test(socketPath)||!Buffer.isBuffer(command)||command.length>1024)
    throw new OperatorProbeError();
  return new Promise((resolve,reject)=>{
    const client=createConnection({path:socketPath});
    let response='',settled=false;
    const fail=()=>{if(!settled){settled=true;client.destroy();reject(new OperatorProbeError());}};
    client.setTimeout(8000,fail);
    client.on('error',fail);
    client.on('data',part=>{response+=part.toString('utf8');if(response.length>512)fail();});
    client.on('end',()=>{if(!settled){settled=true;resolve(response.replace(/\0/g,'').trim());}});
    client.on('connect',()=>client.end(command));
  });
}
function cryptoSelfTest(raw){
  if(typeof raw!=='string'||!BASE64.test(raw))return false;
  const key=Buffer.from(raw,'base64');
  if(key.length!==32||key.toString('base64')!==raw)return false;
  try{
    const iv=randomBytes(12),aad=Buffer.from('activity-image-v1:synthetic-operator-probe');
    const plain=randomBytes(32);
    const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);
    const content=Buffer.concat([cipher.update(plain),cipher.final()]);
    const tag=cipher.getAuthTag();
    const decipher=createDecipheriv('aes-256-gcm',key,iv);
    decipher.setAAD(aad);decipher.setAuthTag(tag);
    const roundtrip=Buffer.concat([decipher.update(content),decipher.final()]);
    return plain.equals(roundtrip);
  }catch{return false;}finally{key.fill(0);}
}
/**
 * Probe a scanner daemon with only synthetic bytes. Server-side malware
 * detection and clinical/rights acceptance still require external reviewers.
 * check may be replaced ONLY by offline unit tests; CLI uses real socket.
 */
export async function checkMediaOperatorRuntime(env,check=queryLocalClamd){
  let keyTested=false,clamdPing=false,clamdVersion=false,syntheticScan=false;
  try{keyTested=cryptoSelfTest(env?.TB_PRIVATE_DATA_KEY_B64);}catch{}
  const socket=env?.TB_MEDIA_CLAMD_SOCKET;
  if(SOCKET.test(socket||'')){
    try{
      const ping=await check(socket,Buffer.from('zPING\0'));
      clamdPing=ping==='PONG';
      if(clamdPing){
        const version=await check(socket,Buffer.from('zVERSION\0'));
        clamdVersion=/^ClamAV [A-Za-z0-9.\/-]{3,40}/.test(version);
        if(clamdVersion){
          const synthetic=Buffer.from('TheraBridge synthetic scanner connectivity probe only');
          const len=Buffer.alloc(4);len.writeUInt32BE(synthetic.length);
          const command=Buffer.concat([Buffer.from('zINSTREAM\0'),
            len,synthetic,Buffer.alloc(4)]);
          syntheticScan=(await check(socket,command))==='stream: OK';
        }
      }
    }catch{clamdPing=false;clamdVersion=false;syntheticScan=false;}
  }
  const runtimeObserved=keyTested&&clamdPing&&clamdVersion&&syntheticScan;
  return Object.freeze({
    probeKind:'TRUSTED_HOST_SYNTHETIC_RUNTIME_CHECK_NOT_APPROVAL',
    status:runtimeObserved?'TECHNICAL_RUNTIME_OBSERVED':'BLOCKED_RUNTIME_NOT_VERIFIED',
    encryptionRoundtripObserved:keyTested,localScannerPing:clamdPing,
    localScannerVersion:clamdVersion,syntheticStreamScan:syntheticScan,
    actualProductionDatabasePersistence:'NOT_VERIFIED',
    backupRetentionAndDeletion:'NOT_VERIFIED',
    keyRotationAndSeparation:'NOT_VERIFIED',
    malwareNegativeControl:'NOT_VERIFIED',
    independentPrivacySecurityReview:'NOT_APPROVED',
    publicReadEnabled:false,assetPublicationEnabled:false,
    clinicalGate:'NO_GO_G2_G2b',
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==2){
    process.stderr.write('No arguments; run inside authorized server host with secrets injected.\n');
    process.exitCode=1;
  }else{
    const result=await checkMediaOperatorRuntime(process.env);
    process.stdout.write(JSON.stringify(result)+'\n');
    if(result.status!=='TECHNICAL_RUNTIME_OBSERVED')process.exitCode=1;
  }
}
