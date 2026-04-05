import { Text, Box } from "ink";
import { useState, useEffect } from "react";

export type AgumonState = "idle" | "playing" | "paused" | "excited" | "walking";

type Props = { state: AgumonState };

const FRAMES = {
  idle: [
    ["  (o·o)  ", " (  _  ) ", "  d   b  "],
    ["  (o-o)  ", " (  _  ) ", "  d   b  "],
  ],
  playing: [
    [" \\(^o^)/ ", "  /   \\  ", "  d   b  "],
    [" \\(^O^)/ ", " //   \\\\ ", " d     b "],
  ],
  paused: [
    ["  (-.-)  ", " (  _  ) ", "  d   b  ", "  z Z z  "],
    ["  (-.-) z", " (  _  ) ", "  d   b  ", "   z Z   "],
  ],
  excited: [
    [" (>‿◠)✌  ", "  \\   /  ", "  d   b  ", "  !! !!  "],
    [" (>‿◠) ✌ ", " //   \\\\ ", " d     b ", "  !! !!  "],
  ],
  walking: [
    [" ~(˘▾˘~) ", "  /   \\  ", " d     b "],
    [" (˘▾˘~)~ ", "  /   \\  ", "   d b   "],
  ],
};

const COLORS: Record<AgumonState, string> = {
  idle:    "white",
  playing: "magentaBright",
  paused:  "gray",
  excited: "yellowBright",
  walking: "cyanBright",
};

export function Agumon({ state }: Props) {
  const [frame, setFrame] = useState(0);
  const frames = FRAMES[state];
  const speed = state === "playing" ? 350 : state === "walking" ? 450 : 700;

  useEffect(() => {
    setFrame(0);
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), speed);
    return () => clearInterval(t);
  }, [state]);

  const lines = frames[frame];
  const color = COLORS[state];

  return (
    <Box flexDirection="column" alignItems="center">
      {lines.map((line, i) => (
        <Text key={i} color={color} bold>{line}</Text>
      ))}
    </Box>
  );
}
