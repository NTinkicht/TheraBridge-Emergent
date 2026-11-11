// M4-08 final qualification: execute the production API error adapter and
// edge-navigation convenience middleware, including denial and safe redirects.
// No requests leave this Jest process. All locations, cookies and data synthetic.
const response=(status,body)=>({status,ok:status>=200&&status<300,json:jest.fn().mockResolvedValue(body)});
let originalFetch;
beforeAll(()=>{originalFetch=global.fetch;});
afterAll(()=>{global.fetch=originalFetch;});
beforeEach(()=>{jest.resetModules();global.fetch=jest.fn();});

describe('M4-08 real Web API adapter preserves error and transport boundaries',()=>{
  const get=()=>require('../src/lib/api');
  it('adds JSON header and no-store to a default GET',async()=>{
    global.fetch.mockResolvedValue(response(200,{synthetic:true}));
    await expect(get().apiFetch('/api/fictional')).resolves.toEqual({synthetic:true});
    const [path,init]=global.fetch.mock.calls[0];
    expect(path).toBe('/api/fictional');
    expect(init.headers).toEqual({'Content-Type':'application/json'});
    expect(init.cache).toBe('no-store');
  });
  it('preserves caller method, body, custom headers and credentials while enforcing no-store',async()=>{
    global.fetch.mockResolvedValue(response(200,{version:2}));
    const init={method:'PATCH',body:'{"version":2}',credentials:'include',cache:'force-cache',headers:{'X-CSRF-Token':'fictional-csrf','Content-Type':'application/custom+json'}};
    await get().apiFetch('/api/fictional-update',init);
    const [,sent]=global.fetch.mock.calls[0];
    expect(sent).toMatchObject({method:'PATCH',body:init.body,credentials:'include',cache:'no-store'});
    expect(sent.headers).toMatchObject({'X-CSRF-Token':'fictional-csrf','Content-Type':'application/custom+json'});
  });
  it('translates rejected network attempts to a stable API error without echoing internal error',async()=>{
    const {apiFetch,ApiError}=get();
    global.fetch.mockRejectedValue(Error('private DNS and internal address'));
    await expect(apiFetch('/api/fictional')).rejects.toMatchObject({name:'ApiError',status:0,message:'Network error: the API could not be reached'});
    expect(new ApiError(0,'generic')).toBeInstanceOf(Error);
  });
  it('normalizes malformed server response bodies without a JSON parser escape',async()=>{
    const {apiFetch}=get();
    global.fetch.mockResolvedValue({status:502,ok:false,json:jest.fn().mockRejectedValue(Error('internal decoder'))});
    await expect(apiFetch('/api/fictional')).rejects.toMatchObject({status:502,message:'Request failed (502)'});
  });
  it('joins server validation arrays in the documented semicolon format',async()=>{
    const {apiFetch}=get();global.fetch.mockResolvedValue(response(422,{message:['Invalid synthetic input','Stale version']}));
    await expect(apiFetch('/api/fictional')).rejects.toMatchObject({status:422,message:'Invalid synthetic input; Stale version'});
  });
  it('retains non-sensitive machine code while refusing to invent one',()=>{
    const {ApiError}=get();
    expect(new ApiError(409,'Synthetic conflict',{code:'STALE_VERSION'}).code).toBe('STALE_VERSION');
    expect(new ApiError(403,'Denied',{code:12}).code).toBeUndefined();
    expect(new ApiError(403,'Denied').code).toBeUndefined();
  });
  it('returns a valid success payload after a transient prior failure',async()=>{
    const {apiFetch}=get();
    global.fetch.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(response(200,{ready:true}));
    await expect(apiFetch('/api/fictional')).rejects.toMatchObject({status:0});
    await expect(apiFetch('/api/fictional')).resolves.toEqual({ready:true});
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
  it('does not treat a 403 error response as a successful value',async()=>{
    const {apiFetch}=get();global.fetch.mockResolvedValue(response(403,{message:'Forbidden',code:'DENIED'}));
    await expect(apiFetch('/api/protected')).rejects.toMatchObject({status:403,code:'DENIED'});
  });
});

describe('M4-08 middleware is a redirect aid and never an authorization decision',()=>{
  jest.mock('next/server',()=>({
    NextResponse:{
      next:jest.fn(()=>({kind:'next'})),
      redirect:jest.fn(url=>({kind:'redirect',url}))
    }
  }));
  const source=()=>require('../src/middleware');
  const next=()=>require('next/server').NextResponse;
  const request=(cookies,pathname='/app/children',search='?token=fictional-sensitive')=>({
    cookies:{has:jest.fn(k=>cookies.includes(k))},
    nextUrl:{clone:()=>({pathname,search})}
  });
  beforeEach(()=>{next().next.mockClear();next().redirect.mockClear();});
  it('passes __Host session cookie through without mistaking this for API authorization',()=>{
    const result=source().middleware(request(['__Host-tb_session']));
    expect(result.kind).toBe('next');
    expect(next().redirect).not.toHaveBeenCalled();
  });
  it('passes legacy session cookie through but leaves permission checks to API',()=>{
    const result=source().middleware(request(['tb_session']));
    expect(result.kind).toBe('next');
    expect(next().redirect).not.toHaveBeenCalled();
  });
  it('redirects absent sessions to login and drops the original sensitive query',()=>{
    const result=source().middleware(request([],'/app/clinical','?private_token=fictional'));
    expect(result.kind).toBe('redirect');
    expect(result.url).toMatchObject({pathname:'/login',search:''});
    expect(next().next).not.toHaveBeenCalled();
  });
  it('does not mistake an unrelated cookie for a session',()=>{
    const result=source().middleware(request(['fictional_other_cookie'],'/account/settings'));
    expect(result.kind).toBe('redirect');
    expect(result.url.pathname).toBe('/login');
  });
  it('restricts navigation matcher to authenticated app, account and context entry points',()=>{
    expect(source().config.matcher).toEqual(['/app/:path*','/account/:path*','/select-context']);
  });
});
