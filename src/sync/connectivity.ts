// Device connectivity signal for online-only features (today: AI workout
// generation, the app's only network-required feature).
//
// This is deliberately NOT the sync-status "paused" listener: the mutation
// queue pauses on a 4xx (an auth problem that happens while fully online) and
// it says nothing about connectivity while idle. The gate here is the OS
// network state via expo-network, mirrored into a tiny listener registry in
// the style of syncStatus so UI can subscribe without touching the native
// module. Until the first real signal arrives we report online optimistically
// — falsely disabling the feature at startup is worse than letting a tap
// fail with a clear error.

type ConnectivityListener = (online: boolean) => void;

let online = true;
const listeners = new Set<ConnectivityListener>();

export function isOnline(): boolean {
  return online;
}

export function setOnline(value: boolean) {
  if (value === online) return;
  online = value;
  listeners.forEach((l) => l(value));
}

export function onConnectivityChange(
  listener: ConnectivityListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// require() at call time so the native module loads only when monitoring
// actually starts (App bootstrap), never in jest via a mere import.
const loadNetwork = (): typeof import("expo-network") =>
  require("expo-network");

// Wire the registry to the OS. Call once at app start; returns a stop fn.
export function startConnectivityMonitoring(): () => void {
  const Network = loadNetwork();

  const apply = (state: {
    isConnected?: boolean;
    isInternetReachable?: boolean | null;
  }) => {
    // isInternetReachable is null while the OS reachability probe is pending;
    // fall back to the connected flag, staying optimistic if both are unknown.
    setOnline(state.isInternetReachable ?? state.isConnected ?? true);
  };

  const subscription = Network.addNetworkStateListener(apply);
  void Network.getNetworkStateAsync()
    .then(apply)
    .catch(() => {});
  return () => subscription.remove();
}
