import { View, Text, Pressable } from "react-native";
import { AuthBrandMark } from "../components/AuthBrandMark";

type Props = {
  email: string;
  onNavigateSignIn: () => void;
};

export function VerifyEmailScreen({ email, onNavigateSignIn }: Props) {
  return (
    <View testID="verify-email-screen" className="flex-1 bg-page items-center justify-center p-6">
      <View className="w-full max-w-sm">
        <AuthBrandMark />
        <Text className="text-3xl font-bold text-primary mb-1">
          Check your email
        </Text>
        <Text className="text-sm text-secondary mt-4 leading-5">
          Open the verification email we just sent to{" "}
          <Text className="text-primary font-semibold">{email}</Text> and tap
          the link. This screen will close automatically once you've verified.
        </Text>

        <Pressable testID="goto-signin" onPress={onNavigateSignIn} className="mt-8 items-center">
          <Text className="text-muted text-sm">
            Back to{" "}
            <Text className="text-primary-accent-text font-semibold">
              sign in
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
