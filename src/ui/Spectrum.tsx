import { Box, Text } from "ink";
import { useState, useEffect } from "react";

type Props = {
  playing: boolean;
  position: number;
  width: number;
};

const CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const BAR_COLORS = ["cyanBright", "cyan", "magenta", "magentaBright"] as const;

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateBars(position: number, count: number): number[] {
  const t = Math.floor(position * 4);
  return Array.from({ length: count }, (_, i) => {
    if (!position) return 0;
    const base = seededRandom(t * 100 + i) * 0.7;
    const wave = Math.sin(position * 3 + i * 0.8) * 0.15 + 0.15;
    return Math.min(1, base + wave);
  });
}

export function Spectrum({ playing, position, width }: Props) {
  const barCount = Math.floor(width / 2);
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0));

  useEffect(() => {
    if (!playing) {
      setBars(Array(barCount).fill(0));
      return;
    }
    const t = setInterval(() => {
      setBars(generateBars(position + Date.now() / 1000 % 1, barCount));
    }, 80);
    return () => clearInterval(t);
  }, [playing, position, barCount]);

  return (
    <Box>
      {bars.map((v, i) => {
        const charIndex = Math.floor(v * (CHARS.length - 1));
        const colorIndex = Math.floor((i / barCount) * BAR_COLORS.length);
        const color = playing ? BAR_COLORS[colorIndex] : "gray";
        return (
          <Text key={i} color={color}>
            {playing ? CHARS[charIndex] : "▁"}
          </Text>
        );
      })}
    </Box>
  );
}
