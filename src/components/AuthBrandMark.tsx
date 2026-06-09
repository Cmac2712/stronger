import { View } from "react-native";
import { Dumbbell } from "lucide-react-native";
import { Icon } from "./Icon";

// The app's brand mark shown above the title on the auth screens
// (sign in, sign up, verify email). Includes the spacing below it so
// all three screens stay visually identical.
export function AuthBrandMark() {
  return (
    <View className="mb-4">
      <Icon icon={Dumbbell} color="primary-accent-text" size={40} />
    </View>
  );
}
