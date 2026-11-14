// M4-08: execute the production session-selection hook rather than mocking it.
// The provider controls whether the fallback fetch is enabled. Synthetic only.
const React = require('react');
const Renderer = require('react-test-renderer');
const { act, create } = Renderer;
const h = React.createElement;
let mockShared = null;
let mockFallback;
const mockController = jest.fn();
const mockSharedHook = jest.fn();
jest.mock('@/lib/session-context', () => ({
  useSharedSession: (...args) => mockSharedHook(...args),
  useSessionController: (...args) => mockController(...args),
}));
const { useSession } = require('../src/components/auth/useSession');

const sharedSession = { state: { status: 'ready', data: { activeContext: { centerId: 'synthetic-a' } } }, reload: jest.fn(), handle: jest.fn() };
const fallbackSession = { state: { status: 'loading' }, reload: jest.fn(), handle: jest.fn() };
let observed;
function Probe() {
  observed = useSession();
  return h('output', { 'data-testid': 'session-source' }, observed.state.status);
}
beforeEach(() => {
  observed = undefined;
  mockShared = null;
  mockFallback = fallbackSession;
  mockSharedHook.mockImplementation(() => mockShared);
  mockController.mockImplementation(() => mockFallback);
  mockController.mockClear();
  mockSharedHook.mockClear();
});
describe('real useSession selection never crosses provider and standalone boundaries', () => {
  it('uses a shared provider without enabling its independent fallback', () => {
    mockShared = sharedSession;
    let tree;
    act(() => { tree = create(h(Probe)); });
    expect(observed).toBe(sharedSession);
    expect(tree.toJSON().children).toEqual(['ready']);
    expect(mockSharedHook).toHaveBeenCalledTimes(1);
    expect(mockController).toHaveBeenCalledWith(false);
    act(() => tree.unmount());
  });
  it('loads the independent controller outside /app with no shared session', () => {
    let tree;
    act(() => { tree = create(h(Probe)); });
    expect(observed).toBe(fallbackSession);
    expect(tree.toJSON().children).toEqual(['loading']);
    expect(mockController).toHaveBeenCalledWith(true);
    act(() => tree.unmount());
  });
  it('switches from standalone to provider without changing hook call order', () => {
    let tree;
    act(() => { tree = create(h(Probe)); });
    expect(mockController).toHaveBeenLastCalledWith(true);
    mockShared = sharedSession;
    act(() => tree.update(h(Probe)));
    expect(observed).toBe(sharedSession);
    expect(mockController).toHaveBeenLastCalledWith(false);
    mockShared = null;
    act(() => tree.update(h(Probe)));
    expect(observed).toBe(fallbackSession);
    expect(mockController).toHaveBeenLastCalledWith(true);
    expect(mockController).toHaveBeenCalledTimes(3);
    act(() => tree.unmount());
  });
});
