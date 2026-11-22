const { readFileSync }=require('node:fs');
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const {checkLocalMediaReadiness,LocalMediaPreflightError,LOCAL_MEDIA_MAX_BYTES}=
  require('../src/lib/activity-media-local-preflight');
const {LocalActivityMediaReadiness}=require('../src/components/clinical/LocalActivityMediaReadiness');

function pngHeader(w=640,h=480) {
  const bytes=Buffer.alloc(33);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  bytes.writeUInt32BE(13,8);Buffer.from('IHDR').copy(bytes,12);
  bytes.writeUInt32BE(w,16);bytes.writeUInt32BE(h,20);
  bytes[24]=8;bytes[25]=6;
  return bytes;
}
const fakeFile=(header=pngHeader(),overrides={})=>({
  type:'image/png',size:header.length,
  slice:jest.fn(()=>({arrayBuffer:async()=>Uint8Array.from(header).buffer})),
  ...overrides,
});
const text=component=>JSON.stringify(component.toJSON());
let tree;
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});

describe('observation 25: local-only, non-authorizing staff media readiness',()=>{
  it('reads at most the PNG header and gives only nonrelease numeric metadata',async()=>{
    const file=fakeFile(pngHeader(640,480),{size:4*1024*1024});
    const result=await checkLocalMediaReadiness(file);
    expect(file.slice).toHaveBeenCalledWith(0,33);
    expect(result).toEqual({format:'PNG',width:640,height:480,
      byteLength:4*1024*1024,uploaded:false,approved:false,
      publishEnabled:false,safeForStorage:false});
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/name|path|url|content|hash|rights/);
  });
  it('rejects oversize before reading data, incorrect MIME and invalid header or dimensions',async()=>{
    const large=fakeFile(pngHeader(),{size:LOCAL_MEDIA_MAX_BYTES+1});
    await expect(checkLocalMediaReadiness(large)).rejects.toThrow(LocalMediaPreflightError);
    expect(large.slice).not.toHaveBeenCalled();
    const badHeaders=[
      Buffer.alloc(33),pngHeader(0,100),pngHeader(4097,100),pngHeader(4000,4000),
      (()=>{const h=pngHeader();h[25]=3;return h;})(),
      (()=>{const h=pngHeader();h[28]=1;return h;})()
    ];
    for(const header of badHeaders)
      await expect(checkLocalMediaReadiness(fakeFile(header))).rejects.toThrow(LocalMediaPreflightError);
    await expect(checkLocalMediaReadiness(fakeFile(pngHeader(),{type:'image/jpeg'})))
      .rejects.toThrow(LocalMediaPreflightError);
  });
  it('renders accessible local file readiness but never a preview or upload action',async()=>{
    await act(async()=>{tree=create(React.createElement(LocalActivityMediaReadiness));});
    const input=tree.root.findByProps({'data-testid':'m5-local-media-input'});
    expect(input.props.type).toBe('file');
    expect(input.props.accept).toContain('image/png');
    expect(text(tree)).toContain('does not upload, preview, save, publish or approve');
    const file=fakeFile();
    const target={files:[file],value:'C:\\fakepath\\sensitive.png'};
    await act(async()=>{input.props.onChange({currentTarget:target});await Promise.resolve();});
    expect(target.value).toBe('');
    expect(text(tree)).toContain('640 × 480 px');
    expect(text(tree)).toContain('Not scanned, uploaded, stored or approved.');
    expect(text(tree)).not.toContain('sensitive.png');
    expect(tree.root.findAllByProps({'data-testid':'m5-local-media-result'})).toHaveLength(1);
  });
  it('shows a safe local error without leaking a filename',async()=>{
    await act(async()=>{tree=create(React.createElement(LocalActivityMediaReadiness));});
    const input=tree.root.findByProps({'data-testid':'m5-local-media-input'});
    await act(async()=>{input.props.onChange({currentTarget:{files:[fakeFile(Buffer.alloc(33))],value:'secret.png'}});await Promise.resolve();});
    expect(tree.root.findAllByProps({role:'alert'}).length).toBeGreaterThan(0);
    expect(text(tree)).toContain('No file was uploaded');
    expect(text(tree)).not.toContain('secret.png');
  });
  it('ignores a stale async check after a newer selection',async()=>{
    let release;
    const pending={type:'image/png',size:33,slice:()=>({
      arrayBuffer:()=>new Promise(resolve=>{release=()=>resolve(Uint8Array.from(pngHeader(480,360)).buffer);})
    })};
    await act(async()=>{tree=create(React.createElement(LocalActivityMediaReadiness));});
    const input=tree.root.findByProps({'data-testid':'m5-local-media-input'});
    await act(async()=>{input.props.onChange({currentTarget:{files:[pending],value:'old.png'}});});
    await act(async()=>{input.props.onChange({currentTarget:{files:[fakeFile(pngHeader(320,240))],value:'new.png'}});await Promise.resolve();});
    await act(async()=>{release();await Promise.resolve();});
    expect(text(tree)).toContain('320 × 240 px');
    expect(text(tree)).not.toContain('480 × 360 px');
  });
  it('is scoped through activity/version and cannot send media to metadata API',()=>{
    const source=readFileSync('src/components/clinical/ActivityMediaDraftPanel.tsx','utf8');
    expect(source).toContain('<LocalActivityMediaReadiness key={centerId +');
    expect(source).toContain('String(templateVersion ??');
    const local=readFileSync('src/components/clinical/LocalActivityMediaReadiness.tsx','utf8');
    expect(local).not.toMatch(/fetch\(|rest\.send|createObjectURL|FileReader|FormData|localStorage|sessionStorage/);
    expect(local).toContain('void choose(file)');
  });
});
