import { Spectrum } from "../../ports/spectrum.port.js";

const BARS = 56;
const FRAME_MS = 60;

/**
 * Espectro simulado (sin dependencias): random-walk con forma de campana
 * (más energía al centro). Se usa cuando no hay `cava` instalado.
 */
export class SimulatedSpectrum implements Spectrum {
  private timer: NodeJS.Timeout | null = null;
  private listener: (bars: number[]) => void = () => {};
  private values: number[] = new Array(BARS).fill(0);

  subscribe(listener: (bars: number[]) => void): void {
    this.listener = listener;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), FRAME_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.values = this.values.map(() => 0);
    this.listener([...this.values]);
  }

  dispose(): void {
    this.stop();
  }

  private tick(): void {
    this.values = this.values.map((value, i) => {
      const bell = Math.sin((i / (BARS - 1)) * Math.PI); // 0 en bordes, 1 al centro
      const target = Math.random() ** 1.4 * (0.35 + 0.65 * bell);
      return value + (target - value) * 0.55;
    });
    this.listener([...this.values]);
  }
}
