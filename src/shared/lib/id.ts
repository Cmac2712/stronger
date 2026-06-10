let counter = 0;

// Monotonic, collision-resistant id without native crypto (Expo Go safe).
export function genId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
