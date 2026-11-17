import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChild360Receipt, runChild360BrowserAcceptance } from './m5-child360-browser.mjs';

const receipt=()=>({
  schemaVersion:1,environment:'ISOLATED_SYNTHETIC_CI',
  featureFlag:'ENABLED_CI_ONLY',clinicalGate:'NO_GO_G2_G2b',
  humanUsabilityApproval:'NOT_OBTAINED',accessibilityApproval:'NOT_OBTAINED',
  personas:3,observations:15,deniedRoles:1,navigationFailures:0,
  slowLoads:15,failuresRecovered:15,
});
test('evidence must report three synthetic roles and exactly fifteen five-width observations',()=>{
  assert.equal(validateChild360Receipt(receipt()),true);
  for(const [field,value] of [
    ['observations',14],['observations',16],['personas',2],['deniedRoles',0],
    ['navigationFailures',1],['slowLoads',14],['slowLoads',16],
    ['failuresRecovered',14],['failuresRecovered',16],['featureFlag','DISABLED'],['clinicalGate','GO'],
    ['humanUsabilityApproval','APPROVED'],['accessibilityApproval','PASS'],
  ]){
    const invalid={...receipt(),[field]:value};
    assert.throws(()=>validateChild360Receipt(invalid),/missing|sensitive|falsely/);
  }
});
test('evidence rejects private material even when other counts appear sound',()=>{
  for(const field of ['email','cookie','password','childId','html','text']){
    assert.throws(()=>validateChild360Receipt({...receipt(),[field]:'private'}),/sensitive/);
  }
});
test('flagged browser runner refuses non-isolated or default-off execution',async()=>{
  const old={db:process.env.DATABASE_URL,env:process.env.DEPLOYMENT_ENV,flag:process.env.NEXT_PUBLIC_M5_CHILD_COMPACT};
  try{
    process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:5432/prod';
    process.env.DEPLOYMENT_ENV='ci';
    process.env.NEXT_PUBLIC_M5_CHILD_COMPACT='true';
    await assert.rejects(runChild360BrowserAcceptance({passwords:{}}),/explicit flagged/);
    process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:5432/therabridge_demo_test';
    process.env.NEXT_PUBLIC_M5_CHILD_COMPACT='false';
    await assert.rejects(runChild360BrowserAcceptance({passwords:{}}),/explicit flagged/);
  } finally {
    for(const [key,value] of [['DATABASE_URL',old.db],['DEPLOYMENT_ENV',old.env],['NEXT_PUBLIC_M5_CHILD_COMPACT',old.flag]]){
      if(value===undefined)delete process.env[key]; else process.env[key]=value;
    }
  }
});
