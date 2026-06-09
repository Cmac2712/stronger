import type { LucideIcon } from "lucide-react-native";
import { colors } from "../theme";

type Props = {
  // The lucide glyph to render, passed as a component (e.g. icon={Dumbbell})
  // so only the icons actually used end up in the bundle.
  icon: LucideIcon;
  // A theme colour token, not a raw colour value: icon colour stays
  // single-sourced from the theme rather than from utility classes.
  color: keyof typeof colors;
  size?: number;
};

export function Icon({ icon: Glyph, color, size = 24 }: Props) {
  return <Glyph color={colors[color]} size={size} />;
}
