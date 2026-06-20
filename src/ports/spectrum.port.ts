/** Fuente de espectro de audio: emite arrays de barras normalizadas (0..1). */
export interface Spectrum {
  subscribe(listener: (bars: number[]) => void): void;
  start(): void;
  stop(): void;
  dispose(): void;
}
