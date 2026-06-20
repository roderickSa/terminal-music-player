import { spawn, ChildProcess } from "child_process";
import * as net from "net";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { z } from "zod";
import { AudioPlayer, PlaybackSnapshot } from "../../ports/audio-player.port.js";

const IPC_MESSAGE = z.object({
  request_id: z.number().optional(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  event: z.string().optional(),
});

const VOLUME_MIN = 0;
const VOLUME_MAX = 130;
const POLL_MS = 250;
const SEEK_DEBOUNCE_MS = 80;
const SOCKET_RETRIES = 20;
const SOCKET_RETRY_MS = 100;
const STOP_GRACE_MS = 100;

/**
 * Adapter de mpv: maneja el proceso y el socket IPC. SOLO transporte —
 * no sabe de playlist/shuffle/repeat. Persiste volumen/mute entre pistas y
 * hace updates optimistas (pausa/seek/volumen) para que la UI reaccione ya.
 */
export class MpvAudioPlayer implements AudioPlayer {
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private readonly socketPath: string;
  private requestId = 0;
  private readonly pending = new Map<number, (data: unknown) => void>();
  private pollInterval: NodeJS.Timeout | null = null;
  private seekTimeout: NodeJS.Timeout | null = null;
  private pendingSeek = 0;

  private position = 0;
  private duration = 0;
  private playing = false;
  private volume = 100;
  private muted = false;

  private snapshotListener: (snapshot: PlaybackSnapshot) => void = () => {};
  private trackEndedListener: () => void = () => {};

  constructor() {
    this.socketPath = path.join(os.tmpdir(), `mpv-${process.pid}.sock`);
    process.on("exit", () => this.cleanupResources());
    process.on("SIGINT", () => this.exitAfterCleanup(0));
    process.on("SIGTERM", () => this.exitAfterCleanup(0));
  }

  onSnapshot(listener: (snapshot: PlaybackSnapshot) => void): void {
    this.snapshotListener = listener;
  }

  onTrackEnded(listener: () => void): void {
    this.trackEndedListener = listener;
  }

  async play(filePath: string): Promise<void> {
    await this.stop();

    this.position = 0;
    this.duration = 0;
    this.playing = true;
    this.emit();

    this.process = spawn("mpv", [
      "--no-video",
      "--no-terminal",
      `--volume=${this.volume}`,
      `--mute=${this.muted ? "yes" : "no"}`,
      `--input-ipc-server=${this.socketPath}`,
      filePath,
    ]);

    this.process.on("exit", (code) => {
      if (code === 0) {
        this.trackEndedListener();
        return;
      }
      this.playing = false;
      this.emit();
    });

    await this.waitForSocket();
    this.connectSocket();
    this.startPolling();
  }

  async stop(): Promise<void> {
    this.cleanupResources();
    await delay(STOP_GRACE_MS);
  }

  async dispose(): Promise<void> {
    await this.stop();
  }

  async togglePause(): Promise<void> {
    this.playing = !this.playing;
    this.emit();
    await this.send(["cycle", "pause"]);
  }

  async seekRelative(seconds: number): Promise<void> {
    this.pendingSeek += seconds;
    const target = this.position + seconds;
    this.position = clamp(target, 0, this.duration || target);
    this.emit();

    if (this.seekTimeout) clearTimeout(this.seekTimeout);
    this.seekTimeout = setTimeout(() => {
      const delta = this.pendingSeek;
      this.pendingSeek = 0;
      void this.send(["seek", delta, "relative"]);
    }, SEEK_DEBOUNCE_MS);
  }

  async restart(): Promise<void> {
    this.position = 0;
    this.emit();
    await this.send(["set_property", "time-pos", 0]);
  }

  async changeVolume(delta: number): Promise<void> {
    this.volume = clamp(this.volume + delta, VOLUME_MIN, VOLUME_MAX);
    if (this.volume > 0) this.muted = false;
    this.emit();
    await this.send(["set_property", "volume", this.volume]);
  }

  async toggleMuted(): Promise<void> {
    this.muted = !this.muted;
    this.emit();
    await this.send(["set_property", "mute", this.muted]);
  }

  private emit(): void {
    this.snapshotListener(
      new PlaybackSnapshot(this.position, this.duration, this.playing, this.volume, this.muted),
    );
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => void this.poll(), POLL_MS);
  }

  private async poll(): Promise<void> {
    if (!this.socket || this.socket.destroyed) return;
    const [pos, dur, pause, vol, mute] = await Promise.all([
      this.getNumber("time-pos"),
      this.getNumber("duration"),
      this.getBoolean("pause"),
      this.getNumber("volume"),
      this.getBoolean("mute"),
    ]);
    this.position = pos ?? 0;
    this.duration = dur ?? 0;
    this.playing = !(pause ?? true);
    if (vol !== null) this.volume = Math.round(vol);
    if (mute !== null) this.muted = mute;
    this.emit();
  }

  private async getNumber(property: string): Promise<number | null> {
    const data = await this.send(["get_property", property]);
    const parsed = z.number().safeParse(data);
    return parsed.success ? parsed.data : null;
  }

  private async getBoolean(property: string): Promise<boolean | null> {
    const data = await this.send(["get_property", property]);
    const parsed = z.boolean().safeParse(data);
    return parsed.success ? parsed.data : null;
  }

  /** Envía un comando IPC y resuelve con su `data` (o null si no hay socket). */
  private send(command: unknown[]): Promise<unknown> {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.destroyed) {
        resolve(null);
        return;
      }
      const id = ++this.requestId;
      this.pending.set(id, resolve);
      try {
        this.socket.write(`${JSON.stringify({ command, request_id: id })}\n`);
      } catch {
        this.pending.delete(id);
        resolve(null);
      }
    });
  }

  private connectSocket(): void {
    this.socket = net.createConnection(this.socketPath);
    this.socket.on("error", () => {});
    this.socket.on("data", (chunk) => this.onSocketData(chunk));
  }

  private onSocketData(chunk: Buffer | string): void {
    const lines = chunk.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      const message = this.parseMessage(line);
      if (message === null || message.request_id === undefined) continue;
      const resolve = this.pending.get(message.request_id);
      if (!resolve) continue;
      this.pending.delete(message.request_id);
      resolve(message.data ?? null);
    }
  }

  private parseMessage(line: string): z.infer<typeof IPC_MESSAGE> | null {
    try {
      const parsed = IPC_MESSAGE.safeParse(JSON.parse(line));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private waitForSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const check = (remaining: number) => {
        if (fs.existsSync(this.socketPath)) return resolve();
        if (remaining <= 0) return reject(new Error("MPV socket timeout"));
        setTimeout(() => check(remaining - 1), SOCKET_RETRY_MS);
      };
      check(SOCKET_RETRIES);
    });
  }

  private exitAfterCleanup(code: number): void {
    this.cleanupResources();
    process.exit(code);
  }

  private cleanupResources(): void {
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
      this.seekTimeout = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    if (this.process) {
      this.process.removeAllListeners();
      this.process.kill();
      this.process = null;
    }
    if (fs.existsSync(this.socketPath)) fs.unlinkSync(this.socketPath);
    this.pending.clear();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
