import test from 'node:test';
import assert from 'node:assert/strict';
import {checkMediaOperatorRuntime} from './m5-media-operator-probe.mjs';
const valid={TB_PRIVATE_DATA_KEY_B64:Buffer.alloc(32,7).toString('base64'),
  TB_MEDIA_CLAMD_SOCKET:'/run/clamav/clamd.ctl'};
test('missing or invalid runtime blocks without logging secrets',async()=>{
  for(const env of [{},{...valid,TB_PRIVATE_DATA_KEY_B64:'invalid'},
    {...valid,TB_MEDIA_CLAMD_SOCKET:'tcp://example.com:3000'},
    {...valid,TB_MEDIA_CLAMD_SOCKET:'/tmp/clamd.ctl'}]){
    const result=await checkMediaOperatorRuntime(env,async()=>{throw Error('Offline');});
    assert.equal(result.status,'BLOCKED_RUNTIME_NOT_VERIFIED');
    assert.equal(result.assetPublicationEnabled,false);
    assert(!JSON.stringify(result).includes('clamd.ctl'));
    assert(!JSON.stringify(result).includes(valid.TB_PRIVATE_DATA_KEY_B64));
  }
});
test('synthetic trusted scanner responses verify connectivity, NEVER approval',async()=>{
  const commands=[];
  const probe=async (_socket,buffer)=>{
    commands.push(buffer);
    if(buffer.equals(Buffer.from('zPING\0')))return 'PONG';
    if(buffer.equals(Buffer.from('zVERSION\0')))return 'ClamAV 1.4.0/10000';
    if(buffer.subarray(0,10).equals(Buffer.from('zINSTREAM\0')))return 'stream: OK';
    throw Error('Unexpected');
  };
  const x=await checkMediaOperatorRuntime(valid,probe);
  assert.equal(x.status,'TECHNICAL_RUNTIME_OBSERVED');
  assert.equal(x.encryptionRoundtripObserved,true);
  assert.equal(x.syntheticStreamScan,true);
  assert.equal(x.actualProductionDatabasePersistence,'NOT_VERIFIED');
  assert.equal(x.malwareNegativeControl,'NOT_VERIFIED');
  assert.equal(x.independentPrivacySecurityReview,'NOT_APPROVED');
  assert.equal(x.assetPublicationEnabled,false);
  assert.equal(x.publicReadEnabled,false);
  assert.equal(x.clinicalGate,'NO_GO_G2_G2b');
  assert.equal(commands.length,3);
});
test('scanner errors and fake clean response never pass technical readiness',async()=>{
  for(const failure of ['ERROR','stream: FOUND','',null]){
    const x=await checkMediaOperatorRuntime(valid,async (_socket,b)=>{
      if(b.equals(Buffer.from('zPING\0')))return 'PONG';
      if(b.equals(Buffer.from('zVERSION\0')))return 'ClamAV 1.4.0/10000';
      return failure;
    });
    assert.equal(x.status,'BLOCKED_RUNTIME_NOT_VERIFIED');
    assert.equal(x.syntheticStreamScan,false);
  }
});
