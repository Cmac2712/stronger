import {
  isOnline,
  setOnline,
  onConnectivityChange,
  startConnectivityMonitoring,
} from "./connectivity";

// startConnectivityMonitoring lazily requires expo-network; mock the native
// module so tests drive the OS signal by hand.
type NetworkEvent = {
  isConnected?: boolean;
  isInternetReachable?: boolean | null;
};
const mockSubscription = { remove: jest.fn() };
const mockAddNetworkStateListener = jest.fn(
  (_listener: (event: NetworkEvent) => void) => mockSubscription
);
const mockGetNetworkStateAsync = jest.fn<Promise<NetworkEvent>, []>();
jest.mock("expo-network", () => ({
  addNetworkStateListener: (listener: (event: NetworkEvent) => void) =>
    mockAddNetworkStateListener(listener),
  getNetworkStateAsync: () => mockGetNetworkStateAsync(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
});

describe("connectivity signal", () => {
  it("is optimistically online before any signal arrives", () => {
    expect(isOnline()).toBe(true);
  });

  it("notifies listeners when the state changes", () => {
    const seen: boolean[] = [];
    onConnectivityChange((online) => seen.push(online));

    setOnline(false);
    setOnline(true);

    expect(seen).toEqual([false, true]);
    expect(isOnline()).toBe(true);
  });

  it("does not notify when the state is unchanged", () => {
    const listener = jest.fn();
    onConnectivityChange(listener);

    setOnline(true);

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = onConnectivityChange(listener);
    unsubscribe();

    setOnline(false);

    expect(listener).not.toHaveBeenCalled();
    expect(isOnline()).toBe(false);
  });
});

describe("startConnectivityMonitoring", () => {
  it("adopts the initial OS network state", async () => {
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    startConnectivityMonitoring();
    await Promise.resolve(); // let the initial fetch settle

    expect(isOnline()).toBe(false);
  });

  it("follows network state events", () => {
    mockGetNetworkStateAsync.mockResolvedValue({});
    startConnectivityMonitoring();
    const emit = mockAddNetworkStateListener.mock.calls[0][0];

    emit({ isConnected: false, isInternetReachable: false });
    expect(isOnline()).toBe(false);

    emit({ isConnected: true, isInternetReachable: true });
    expect(isOnline()).toBe(true);
  });

  it("treats an unknown reachability probe as the connected flag", () => {
    mockGetNetworkStateAsync.mockResolvedValue({});
    startConnectivityMonitoring();
    const emit = mockAddNetworkStateListener.mock.calls[0][0];

    setOnline(true);
    emit({ isConnected: false, isInternetReachable: null });
    expect(isOnline()).toBe(false);

    emit({ isConnected: true, isInternetReachable: null });
    expect(isOnline()).toBe(true);
  });

  it("returns a stop function that removes the OS subscription", () => {
    mockGetNetworkStateAsync.mockResolvedValue({});
    const stop = startConnectivityMonitoring();

    stop();

    expect(mockSubscription.remove).toHaveBeenCalled();
  });
});
