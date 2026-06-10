import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, AppState } from "react-native";
import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";
import { Icon } from "@shared/ui/Icon";
import { useWorkoutStore, workoutStore } from "../store/workoutStore";
import { restRemainingMs, isRestExpired } from "@shared/lib/restTimer";
import { formatRestClock } from "@shared/lib/format";

const ADJUST_STEP_MS = 30_000;
const MIN_DURATION_MS = 30_000;
const MAX_DURATION_MS = 600_000;

// Rest-between-sets countdown shown on the active session. Remaining time is
// always computed from the timer's target timestamp (see restTimer.ts), so the
// display stays correct across backgrounding and tab switches; the interval
// below only drives re-renders, it is not the source of truth.
export function RestTimerBar() {
  const timer = useWorkoutStore((s) => s.restTimer);
  const restDurationMs = useWorkoutStore((s) => s.restDurationMs);

  const [now, setNow] = useState(() => Date.now());
  const wasExpired = useRef(false);

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    // Re-sync immediately when the app returns to the foreground rather than
    // waiting for the next tick.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [timer.status]);

  const expired = isRestExpired(timer, now);

  useEffect(() => {
    if (expired && !wasExpired.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    wasExpired.current = expired;
  }, [expired]);

  const remaining = restRemainingMs(timer, now);
  const store = workoutStore.getState();

  const adjust = (delta: number) => {
    const next = Math.min(
      MAX_DURATION_MS,
      Math.max(MIN_DURATION_MS, restDurationMs + delta)
    );
    store.setRestDuration(next);
  };

  return (
    <View
      className={`rounded-surface p-4 mb-4 ${
        expired ? "bg-success" : "bg-card-elevated"
      }`}
      accessibilityLabel="Rest timer"
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-xs font-semibold ${
            expired ? "text-on-accent/80" : "text-muted"
          }`}
        >
          REST
        </Text>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => adjust(-ADJUST_STEP_MS)}
            hitSlop={8}
            accessibilityLabel="Decrease rest duration"
            className="w-8 h-8 rounded-full bg-on-accent/20 items-center justify-center"
          >
            <Icon icon={Minus} size={16} color="on-accent" />
          </Pressable>
          <Text className="text-on-accent/80 text-xs mx-2 w-12 text-center">
            {formatRestClock(restDurationMs)}
          </Text>
          <Pressable
            onPress={() => adjust(ADJUST_STEP_MS)}
            hitSlop={8}
            accessibilityLabel="Increase rest duration"
            className="w-8 h-8 rounded-full bg-on-accent/20 items-center justify-center"
          >
            <Icon icon={Plus} size={16} color="on-accent" />
          </Pressable>
        </View>
      </View>

      <Text
        className="text-on-accent text-5xl font-bold text-center my-2"
        accessibilityLabel={`Rest remaining ${formatRestClock(remaining)}`}
      >
        {expired ? "Rest up!" : formatRestClock(remaining)}
      </Text>

      <View className="flex-row justify-center">
        {timer.status === "running" && (
          <TimerButton label="Pause" onPress={() => store.pauseRestTimer()} />
        )}
        {timer.status === "paused" && (
          <TimerButton label="Resume" onPress={() => store.resumeRestTimer()} />
        )}
        {timer.status === "idle" && (
          <TimerButton label="Start" onPress={() => store.startRestTimer()} />
        )}
        <TimerButton label="Reset" onPress={() => store.resetRestTimer()} />
      </View>
    </View>
  );
}

function TimerButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-on-accent/20 rounded-control px-6 py-2 mx-2"
      accessibilityLabel={label}
    >
      <Text className="text-on-accent font-semibold">{label}</Text>
    </Pressable>
  );
}
