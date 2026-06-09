import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Dumbbell, History } from "lucide-react-native";
import { Icon } from "../components/Icon";
import { WorkoutScreen } from "../screens/WorkoutScreen";
import { ExercisePickerScreen } from "../screens/ExercisePickerScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SessionDetailScreen } from "../screens/SessionDetailScreen";
import { ExerciseHistoryScreen } from "../screens/ExerciseHistoryScreen";
import { colors } from "../theme";

export type WorkoutStackParamList = {
  WorkoutHome: undefined;
  ExercisePicker: undefined;
  ExerciseHistory: { exerciseId: string };
};

export type HistoryStackParamList = {
  HistoryHome: undefined;
  SessionDetail: { sessionId: string };
  ExerciseHistory: { exerciseId: string };
};

const Tab = createBottomTabNavigator();
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();

function WorkoutStackScreen() {
  return (
    <WorkoutStack.Navigator>
      <WorkoutStack.Screen name="WorkoutHome" component={WorkoutScreen} options={{ title: "Workout" }} />
      <WorkoutStack.Screen
        name="ExercisePicker"
        component={ExercisePickerScreen}
        options={{ presentation: "modal", title: "Add Exercise" }}
      />
      <WorkoutStack.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{ title: "Exercise" }}
      />
    </WorkoutStack.Navigator>
  );
}

function HistoryStackScreen() {
  return (
    <HistoryStack.Navigator>
      <HistoryStack.Screen name="HistoryHome" component={HistoryScreen} options={{ title: "History" }} />
      <HistoryStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: "Session" }} />
      <HistoryStack.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{ title: "Exercise" }}
      />
    </HistoryStack.Navigator>
  );
}

// The same tokens as tabBarActiveTintColor/tabBarInactiveTintColor below, so
// icon tint and label tint can never drift apart. (Icon takes a theme token,
// so we map from `focused` rather than echoing the resolved tint hex back.)
function tabIconColor(focused: boolean) {
  return focused ? ("primary-accent-text" as const) : ("muted" as const);
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // primary-accent-text (not primary-accent) for the active tint: tab
        // labels/icons are small text on the dark card, where the lighter
        // text-variant of the blue accent keeps contrast legible.
        tabBarActiveTintColor: colors["primary-accent-text"],
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen
        name="Workout"
        component={WorkoutStackScreen}
        options={{
          tabBarButtonTestID: "tab-workout",
          tabBarIcon: ({ focused, size }) => (
            <Icon icon={Dumbbell} size={size} color={tabIconColor(focused)} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStackScreen}
        options={{
          tabBarButtonTestID: "tab-history",
          tabBarIcon: ({ focused, size }) => (
            <Icon icon={History} size={size} color={tabIconColor(focused)} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
