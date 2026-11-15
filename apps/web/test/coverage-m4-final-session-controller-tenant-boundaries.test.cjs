// M4-08: execute the real session controller's tenant, expiry and stale-request
// behavior under synthetic inputs. No real accounts, cookies, network or clinical data.
const React = require('react');
const Renderer = require('react-test-renderer');
const { act, create } = Renderer;
const h = React.createElement;
const mockRouter = { replace: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/lib/auth', () => ({
  authApi: { session: jest.fn(), centerSummary: jest.fn() },
  onUnauthorized: jest.fn(() => jest.fn()),
}));
jest.mock('@/lib/operations', () => ({ setCenterTz: jest.fn() }));
const { authApi, onUnauthorized } = require('../src/lib/auth');
const { setCenterTz } = require('../src/lib/operations');
const { ApiError } = require('../src/lib/api');
const { useSessionController } = require('../src/lib/session-context');
const ready = (centerId = 'fictional-center', permissions = []) => ({
  activeContext: { type: 'center', centerId },
  permissions,
  user: { id: 'fictional-user' },
  contexts: [],
  csrfToken: 'fictional-token',
});
let controller;
function Probe({ enabled = true }) {
  controller = useSessionController(enabled);
  return h('output', null, controller.state.status);
}
let tree;
const mount = async (enabled = true) => act(async () => { tree = create(h(Probe, { enabled })); });
afterEach(async () => {
  if (tree) { await act(async () => tree.unmount()); tree = null; }
});
beforeEach(() => {
  jest.clearAllMocks();
  controller = undefined;
  authApi.session.mockResolvedValue(ready());
  authApi.centerSummary.mockResolvedValue({center:{timezone:'Asia/Dubai'}});
});
describe('M4-08 real session controller authorization boundaries', () => {
  it('does not load a second session when the shared-provider fallback is disabled', async () => {
    await mount(false);
    expect(controller.state.status).toBe('loading');
    expect(authApi.session).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
    await act(async () => controller.reload());
    expect(authApi.session).not.toHaveBeenCalled();
  });
  it('loads session only, without privileged center-summary read permission', async () => {
    await mount();
    expect(controller.state.status).toBe('ready');
    expect(authApi.session).toHaveBeenCalledTimes(1);
    expect(authApi.centerSummary).not.toHaveBeenCalled();
    expect(setCenterTz).toHaveBeenCalledWith(undefined);
  });
  it('loads timezone only for the authorized active center, not a different tenant', async () => {
    authApi.session.mockResolvedValue(ready('center-allowed', ['center.summary.read']));
    await mount();
    expect(authApi.centerSummary).toHaveBeenCalledWith('center-allowed');
    expect(setCenterTz).toHaveBeenCalledWith('Asia/Dubai');
    expect(controller.state.status).toBe('ready');
  });
  it('redirects expired 401 session without recording a fake successful session', async () => {
    authApi.session.mockRejectedValue(new ApiError(401, 'Synthetic expired'));
    await mount();
    expect(mockRouter.replace).toHaveBeenCalledWith('/login?expired=1');
    expect(controller.state.status).not.toBe('ready');
  });
  it('treats 403/404 as access denied and 401 as session expiry', async () => {
    await mount(false);
    act(() => controller.handle(new ApiError(403, 'Synthetic forbidden')));
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/access-denied');
    act(() => controller.handle(new ApiError(404, 'Synthetic not found')));
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/access-denied');
    act(() => controller.handle(new ApiError(401, 'Synthetic expired')));
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/login?expired=1');
    expect(setCenterTz).toHaveBeenCalledWith(undefined);
    expect(() => controller.handle(new Error('Synthetic unexpected failure'))).toThrow('Synthetic unexpected failure');
  });
  it('discards a superseded session response before reading the old tenant summary', async () => {
    let firstResolve;
    authApi.session.mockImplementationOnce(() => new Promise(resolve => { firstResolve = resolve; }))
      .mockResolvedValueOnce(ready('new-center', []));
    // Mount without awaiting the pending first session fetch.
    await act(async () => { tree = create(h(Probe)); });
    await act(async () => { await controller.reload(); });
    expect(controller.state.status).toBe('ready');
    await act(async () => { firstResolve(ready('old-center', ['center.summary.read'])); await Promise.resolve(); });
    expect(authApi.centerSummary).not.toHaveBeenCalledWith('old-center');
    expect(controller.state.data.activeContext.centerId).toBe('new-center');
  });
});
