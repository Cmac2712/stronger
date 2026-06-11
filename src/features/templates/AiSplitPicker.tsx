import { Modal, Pressable, Text, View } from "react-native";
import { SPLITS, SPLIT_LABELS, type Split } from "./templateLibrary";

// The AI workout's single question: which split? One tap selects and the
// caller goes straight to generation — no confirmation step (PRD #39).
export function AiSplitPicker({
  visible,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  onSelect: (split: Split) => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/60 justify-center p-6">
        <View
          testID="ai-split-picker"
          className="bg-card border border-subtle rounded-surface p-5"
        >
          <Text className="text-xl font-bold text-primary mb-1">
            AI workout
          </Text>
          <Text className="text-sm text-muted mb-4">
            What do you want to train today?
          </Text>
          {SPLITS.map((split) => (
            <Pressable
              key={split}
              testID={`ai-split-${split}`}
              onPress={() => onSelect(split)}
              className="bg-page border border-subtle rounded-control py-3 px-4 mb-2"
            >
              <Text className="text-base font-medium text-primary">
                {SPLIT_LABELS[split]}
              </Text>
            </Pressable>
          ))}
          <Pressable
            testID="ai-split-cancel"
            onPress={onCancel}
            className="py-3 items-center"
          >
            <Text className="text-muted font-medium">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
