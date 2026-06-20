import { Text, Box } from "ink";
import Gradient, { type GradientName } from "ink-gradient";
import { useState, useEffect } from "react";
import { CREAM } from "./theme.js";

export type MascotState = "idle" | "playing" | "paused" | "excited" | "walking";

/**
 * "Lumi": mascota original (no IP de terceros) — una criatura redondita con
 * una antena ✦ que reacciona a la reproducción. Cada estado tiene sus frames.
 */
const FRAMES: Record<MascotState, string[][]> = {
  idle: [
    ["  ✦    ", " ╭┈◠┈╮ ", " │o  o│ ", " ╰─◡─╯ "],
    ["  ✦    ", " ╭┈◠┈╮ ", " │-  -│ ", " ╰─◡─╯ "],
  ],
  playing: [
    ["  ✦  ♪ ", " ╭┈◠┈╮ ", " │^  ^│ ", " ╰─▽─╯ "],
    [" ♫ ✦   ", " ╭┈◠┈╮ ", " │o  o│ ", " ╰─▽─╯ "],
    ["  ✦ ♪  ", " ╭┈◠┈╮ ", " │^  ^│ ", " ╰╮ ╭╯ "],
  ],
  paused: [
    ["  ✦    ", " ╭┈◠┈╮ ", " │-  -│ ", " ╰───╯z"],
    ["  ✦  z ", " ╭┈◠┈╮ ", " │u  u│ ", " ╰───╯ "],
  ],
  excited: [
    [" ✦ ! ✦ ", " ╭┈◠┈╮ ", " │*  *│ ", " ╰─▽─╯ "],
    [" ! ✦ ! ", " ╭┈◠┈╮ ", " │◎  ◎│ ", " ╰─▽─╯ "],
  ],
  walking: [
    ["  ✦    ", " ╭┈◠┈╮ ", " │o  o│ ", " ╰╯ ╰─╮"],
    ["  ✦    ", " ╭┈◠┈╮ ", " │o  o│ ", " ╭─╯ ╰╯"],
  ],
};

/** Gradiente por estado; playing va crema, paused apagado (sin gradiente). */
const GRADIENT: Record<"idle" | "excited" | "walking", GradientName> = {
  idle: "mind",
  excited: "fruit",
  walking: "summer",
};

const SPEED: Record<MascotState, number> = {
  idle: 700,
  playing: 320,
  paused: 700,
  excited: 200,
  walking: 420,
};

export function Mascot({ state }: { state: MascotState }) {
  const [frame, setFrame] = useState(0);
  const frames = FRAMES[state];
  const speed = SPEED[state];

  useEffect(() => {
    setFrame(0);
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), speed);
    return () => clearInterval(timer);
  }, [state, frames.length, speed]);

  const lines = frames[frame];

  return (
    <Box flexDirection="column" alignItems="flex-start">
      {lines.map((line, i) => {
        if (state === "paused") {
          return <Text key={i} color="gray" dimColor>{line}</Text>;
        }
        if (state === "playing") {
          return (
            <Gradient key={i} colors={CREAM}>
              <Text>{line}</Text>
            </Gradient>
          );
        }
        return (
          <Gradient key={i} name={GRADIENT[state]}>
            <Text>{line}</Text>
          </Gradient>
        );
      })}
    </Box>
  );
}
