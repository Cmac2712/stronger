import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WorkoutScreen } from "../screens/WorkoutScreen";
import { ExercisePickerScreen } from "../screens/ExercisePickerScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { SessionDetailScreen } from "../screens/SessionDetailScreen";

export type WorkoutStackParamList = {
  WorkoutHome: undefined;
  ExercisePicker: undefined;
};

export type HistoryStackParamList = {
  HistoryHome: undefined;
  SessionDetail: { sessionId: string };
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
    </WorkoutStack.Navigator>
  );
}

function HistoryStackScreen() {
  return (
    <HistoryStack.Navigator>
      <HistoryStack.Screen name="HistoryHome" component={HistoryScreen} options={{ title: "History" }} />
      <HistoryStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: "Session" }} />
    </HistoryStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Workout" component={WorkoutStackScreen} />
      <Tab.Screen name="History" component={HistoryStackScreen} />
    </Tab.Navigator>
  );
}
