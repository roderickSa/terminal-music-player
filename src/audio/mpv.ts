import { spawn, ChildProcess } from "child_process";
import * as net from "net";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type MPVStatus = {
  playing: boolean;
  position: number;
  duration: number;
  title: string;
  path: string;
  currentIndex: number;
  total: number;
};

type MPVEventCallback = (status: MPVStatus) => void;

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".ogg", ".wav", ".m4a", ".aac"];

export class MPVPlayer {
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private socketPath: string;
  private requestId = 0;
  private callbacks = new Map<number, (res: any) => void>();
  private onStatusChange: MPVEventCallback;
  private pollInterval: NodeJS.Timeout | null = null;
  private playlist: string[] = [];
  private currentIndex = 0;

  status: MPVStatus = {
    playing: false,
    position: 0,
    duration: 0,
    title: "",
    path: "",
    currentIndex: 0,
    total: 0,
  };

  constructor(onStatusChange: MPVEventCallback) {
    this.onStatusChange = onStatusChange;
    this.socketPath = path.join(os.tmpdir(), `mpv-${process.pid}.sock`);
  }

  async load(filePath: string) {
    await this.quit();

    // Construir playlist con todas las canciones de la misma carpeta
    const dir = path.dirname(filePath);
    this.playlist = fs
      .readdirSync(dir)
      .filter((f) => AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .sort()
      .map((f) => path.join(dir, f));

    this.currentIndex = this.playlist.indexOf(filePath);
    if (this.currentIndex === -1) this.currentIndex = 0;

    await this.loadIndex(this.currentIndex);
  }

  private async loadIndex(index: number) {
    await this.quitProcess();

    const filePath = this.playlist[index];
    this.currentIndex = index;

    this.status.path = filePath;
    this.status.title = path.basename(filePath);
    this.status.currentIndex = index;
    this.status.total = this.playlist.length;
    this.status.position = 0;
    this.status.duration = 0;

    this.process = spawn("mpv", [
      "--no-video",
      "--no-terminal",
      `--input-ipc-server=${this.socketPath}`,
      filePath,
    ]);

    this.process.on("exit", (code) => {
      // Si terminó naturalmente (no por quit), pasa a la siguiente
      if (code === 0) this.next().catch(() => {});
      else {
        this.status.playing = false;
        this.onStatusChange({ ...this.status });
      }
    });

    await this.waitForSocket();
    this.connectSocket();
    this.startPolling();

    this.status.playing = true;
    this.onStatusChange({ ...this.status });
  }

  async next() {
    if (this.playlist.length === 0) return;
    const nextIndex = (this.currentIndex + 1) % this.playlist.length;
    await this.loadIndex(nextIndex);
  }

  async prev() {
    if (this.playlist.length === 0) return;
    // Si llevamos más de 3 segundos, reinicia la canción actual
    if (this.status.position > 3) {
      await this.command(["set_property", "time-pos", 0]);
      return;
    }
    const prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    await this.loadIndex(prevIndex);
  }

  private waitForSocket(retries = 20): Promise<void> {
    return new Promise((resolve, reject) => {
      const check = (n: number) => {
        if (fs.existsSync(this.socketPath)) return resolve();
        if (n <= 0) return reject(new Error("MPV socket timeout"));
        setTimeout(() => check(n - 1), 100);
      };
      check(retries);
    });
  }

  private connectSocket() {
    this.socket = net.createConnection(this.socketPath);
    this.socket.on("data", (data) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.request_id !== undefined && this.callbacks.has(msg.request_id)) {
            this.callbacks.get(msg.request_id)!(msg);
            this.callbacks.delete(msg.request_id);
          }
        } catch {}
      }
    });
  }

  private command(args: any[]): Promise<any> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve(null);
      const id = ++this.requestId;
      this.callbacks.set(id, resolve);
      const cmd = JSON.stringify({ command: args, request_id: id }) + "\n";
      this.socket.write(cmd);
    });
  }

  private startPolling() {
    this.pollInterval = setInterval(async () => {
      const [pos, dur, pause] = await Promise.all([
        this.command(["get_property", "time-pos"]),
        this.command(["get_property", "duration"]),
        this.command(["get_property", "pause"]),
      ]);

      this.status.position = pos?.data ?? 0;
      this.status.duration = dur?.data ?? 0;
      this.status.playing = !(pause?.data ?? true);
      this.onStatusChange({ ...this.status });
    }, 500);
  }

  async togglePause() {
    await this.command(["cycle", "pause"]);
  }

  async seek(seconds: number) {
    await this.command(["seek", seconds, "relative"]);
  }

  private async quitProcess() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    if (this.socket) { this.socket.destroy(); this.socket = null; }
    if (this.process) { this.process.removeAllListeners(); this.process.kill(); this.process = null; }
    if (fs.existsSync(this.socketPath)) fs.unlinkSync(this.socketPath);
    await new Promise((r) => setTimeout(r, 100));
  }

  async quit() {
    await this.quitProcess();
    this.playlist = [];
  }
}
