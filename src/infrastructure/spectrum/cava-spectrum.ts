import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execa, type ResultPromise } from "execa";
import { Spectrum } from "../../ports/spectrum.port.js";

const BARS = 56;
const ASCII_MAX = 1000;

const CONFIG = `[general]
framerate = 30
bars = ${BARS}
[output]
method = raw
raw_target = /dev/stdout
data_format = ascii
ascii_max_range = ${ASCII_MAX}
`;

/**
 * Espectro real vía `cava` (captura el monitor del audio del sistema). Parsea
 * su salida raw/ascii: frames separados por "\n", barras por ";". Si cava
 * falla, simplemente deja de emitir (el caller decide el fallback).
 */
export class CavaSpectrum implements Spectrum {
  private process: ResultPromise | null = null;
  private listener: (bars: number[]) => void = () => {};
  private buffer = "";
  private readonly configPath: string;

  constructor() {
    this.configPath = path.join(os.tmpdir(), `cava-${process.pid}.conf`);
  }

  subscribe(listener: (bars: number[]) => void): void {
    this.listener = listener;
  }

  start(): void {
    if (this.process) return;
    fs.writeFileSync(this.configPath, CONFIG);
    this.process = execa("cava", ["-p", this.configPath], { buffer: false });
    this.process.stdout?.on("data", (chunk: Buffer) => this.onData(chunk));
    this.process.catch(() => {});
  }

  stop(): void {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
    this.buffer = "";
    this.listener(new Array(BARS).fill(0));
  }

  dispose(): void {
    this.stop();
    if (fs.existsSync(this.configPath)) fs.unlinkSync(this.configPath);
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString();
    const frames = this.buffer.split("\n");
    this.buffer = frames.pop() ?? ""; // conserva el frame parcial
    const last = frames[frames.length - 1];
    if (!last) return;

    const bars = last
      .split(";")
      .filter((v) => v.length > 0)
      .map((v) => Math.min(1, Number(v) / ASCII_MAX));
    if (bars.length > 0) this.listener(bars);
  }
}
