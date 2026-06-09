import Svg, { Polyline, Circle } from "react-native-svg";
import { colors } from "../theme";

type Props = {
  values: number[];
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
};

const PAD = 4;

// Pure presentational line plot. Knows nothing about the workout domain — it
// just plots numbers. Empty → renders nothing; single point → a dot; many
// points → a polyline. A flat series (all equal) draws along the midline.
export function Sparkline({
  values,
  width,
  height,
  color = colors["primary-accent-text"],
  strokeWidth = 2,
}: Props) {
  if (values.length === 0) return null;

  const innerW = Math.max(0, width - PAD * 2);
  const innerH = Math.max(0, height - PAD * 2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  // Higher value sits higher on screen (smaller y). Flat series → midline.
  const yFor = (v: number) =>
    span === 0 ? PAD + innerH / 2 : PAD + innerH * (1 - (v - min) / span);
  // Evenly spaced across the width; a lone point is centred.
  const xFor = (i: number) =>
    values.length === 1
      ? PAD + innerW / 2
      : PAD + (innerW * i) / (values.length - 1);

  if (values.length === 1) {
    return (
      <Svg width={width} height={height}>
        <Circle cx={xFor(0)} cy={yFor(values[0])} r={3} fill={color} />
      </Svg>
    );
  }

  const points = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
