import { Text } from "ink";
import Gradient from "ink-gradient";
import { useState, useEffect } from "react";
import { Spectrum } from "../../ports/spectrum.port.js";

const RAMP = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function resample(bars: number[], width: number): number[] {
  if (bars.length === 0) return new Array(width).fill(0);
  const out: number[] = [];
  for (let i = 0; i < width; i++) {
    const idx = Math.floor((i / width) * bars.length);
    out.push(bars[idx] ?? 0);
  }
  return out;
}

export function Visualizer({
  spectrum,
  active,
  width,
}: {
  spectrum: Spectrum;
  active: boolean;
  width: number;
}) {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    spectrum.subscribe(setBars);
    return () => spectrum.stop();
  }, [spectrum]);

  useEffect(() => {
    if (active) spectrum.start();
    else spectrum.stop();
  }, [active, spectrum]);

  const line = resample(bars, width)
    .map((v) => RAMP[Math.max(0, Math.min(8, Math.round(v * 8)))])
    .join("");

  return (
    <Gradient name="vice">
      <Text>{line}</Text>
    </Gradient>
  );
}
