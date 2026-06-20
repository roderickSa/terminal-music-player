import { spawn, ChildProcess } from "child_process";
import * as net from "net";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseFile } from "music-metadata";
import { AUDIO_EXTENSIONS } from "../config.js";

export type RepeatMode = "off" | "all" | "one";

export type MPVStatus = {
  playing: boolean;
  position: number;
  duration: number;
  title: string;
  artist: string;
  album: string;
  path: string;
  currentIndex: number;
  total: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
};

type MPVEventCallback = (status: MPVStatus) => void;

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
  private seekTimeout: NodeJS.Timeout | null = null;
  private pendingSeek = 0;
  private history: number[] = [];

  status: MPVStatus = {
    playing: false,
    position: 0,
    duration: 0,
    title: "",
    artist: "",
    album: "",
    path: "",
    currentIndex: 0,
    total: 0,
    volume: 100,
    muted: false,
    shuffle: false,
    repeat: "off",
  };

  constructor(onStatusChange: MPVEventCallback) {
    this.onStatusChange = onStatusChange;
    this.socketPath = path.join(os.tmpdir(), `mpv-${process.pid}.sock`);

    const cleanup = () => { this.quitProcess(); };
    process.on("exit", cleanup);
    process.on("SIGINT", () => { this.quitProcess(); process.exit(0); });
    process.on("SIGTERM", () => { this.quitProcess(); process.exit(0); });
    process.on("uncaughtException", (err) => {
      console.error(err);
      this.quitProcess();
      process.exit(1);
    });
  }

  async load(filePath: string) {
    await this.quit();

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
    this.status.title = path.basename(filePath).replace(/\.[^/.]+$/, "");
    this.status.artist = "";
    this.status.album = "";
    this.status.currentIndex = index;
    this.status.total = this.playlist.length;
    this.status.position = 0;
    this.status.duration = 0;

    this.process = spawn("mpv", [
      "--no-video",
      "--no-terminal",
      `--volume=${this.status.volume}`,
      `--mute=${this.status.muted ? "yes" : "no"}`,
      `--input-ipc-server=${this.socketPath}`,
      filePath,
    ]);

    this.process.on("exit", (code) => {
      if (code === 0) this.handleTrackEnd().catch(() => {});
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

    this.loadMetadata(filePath);
  }

  /** Lee tags ID3 en segundo plano y refresca el estado si sigue siendo la pista actual. */
  private async loadMetadata(filePath: string) {
    try {
      const { common } = await parseFile(filePath);
      if (this.status.path !== filePath) return; // cambió de canción mientras leíamos
      if (common.title) this.status.title = common.title;
      this.status.artist = common.artist ?? "";
      this.status.album = common.album ?? "";
      this.onStatusChange({ ...this.status });
    } catch {
      // sin tags legibles: nos quedamos con el nombre de archivo
    }
  }

  private pickRandomIndex(): number {
    if (this.playlist.length <= 1) return this.currentIndex;
    let idx = this.currentIndex;
    while (idx === this.currentIndex) {
      idx = Math.floor(Math.random() * this.playlist.length);
    }
    return idx;
  }

  /** Avance automático al terminar una pista (respeta repeat/shuffle). */
  private async handleTrackEnd() {
    if (this.playlist.length === 0) return;

    if (this.status.repeat === "one") {
      await this.loadIndex(this.currentIndex);
      return;
    }

    const atLast = this.currentIndex === this.playlist.length - 1;
    if (!this.status.shuffle && atLast && this.status.repeat === "off") {
      this.status.playing = false;
      this.onStatusChange({ ...this.status });
      return;
    }

    this.history.push(this.currentIndex);
    const nextIndex = this.status.shuffle
      ? this.pickRandomIndex()
      : (this.currentIndex + 1) % this.playlist.length;
    await this.loadIndex(nextIndex);
  }

  async next() {
    if (this.playlist.length === 0) return;
    this.history.push(this.currentIndex);
    const nextIndex = this.status.shuffle
      ? this.pickRandomIndex()
      : (this.currentIndex + 1) % this.playlist.length;
    await this.loadIndex(nextIndex);
  }

  async prev() {
    if (this.playlist.length === 0) return;
    if (this.status.position > 3) {
      await this.command(["set_property", "time-pos", 0]);
      return;
    }
    let prevIndex: number;
    if (this.status.shuffle && this.history.length > 0) {
      prevIndex = this.history.pop()!;
    } else {
      prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    }
    await this.loadIndex(prevIndex);
  }

  toggleShuffle() {
    this.status.shuffle = !this.status.shuffle;
    this.history = [];
    this.onStatusChange({ ...this.status });
  }

  cycleRepeat() {
    const order: RepeatMode[] = ["off", "all", "one"];
    const next = order[(order.indexOf(this.status.repeat) + 1) % order.length];
    this.status.repeat = next;
    this.onStatusChange({ ...this.status });
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

    this.socket.on("error", () => {});

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
      if (!this.socket || this.socket.destroyed) return resolve(null);
      const id = ++this.requestId;
      this.callbacks.set(id, resolve);
      try {
        const cmd = JSON.stringify({ command: args, request_id: id }) + "\n";
        this.socket.write(cmd);
      } catch {
        this.callbacks.delete(id);
        resolve(null);
      }
    });
  }

  private startPolling() {
    this.pollInterval = setInterval(async () => {
      if (!this.socket || this.socket.destroyed) return;
      const [pos, dur, pause, vol, mute] = await Promise.all([
        this.command(["get_property", "time-pos"]),
        this.command(["get_property", "duration"]),
        this.command(["get_property", "pause"]),
        this.command(["get_property", "volume"]),
        this.command(["get_property", "mute"]),
      ]);
      this.status.position = pos?.data ?? 0;
      this.status.duration = dur?.data ?? 0;
      this.status.playing = !(pause?.data ?? true);
      if (vol?.data != null) this.status.volume = Math.round(vol.data);
      if (mute?.data != null) this.status.muted = mute.data;
      this.onStatusChange({ ...this.status });
    }, 250);
  }

  async togglePause() {
    // update optimista: la UI reacciona al instante, sin esperar al poll
    this.status.playing = !this.status.playing;
    this.onStatusChange({ ...this.status });
    await this.command(["cycle", "pause"]);
  }

  async seek(seconds: number) {
    // acumula pulsaciones rápidas en un solo salto y refleja la posición al instante
    this.pendingSeek += seconds;
    const target = this.status.position + seconds;
    this.status.position = Math.max(0, Math.min(target, this.status.duration || target));
    this.onStatusChange({ ...this.status });

    if (this.seekTimeout) clearTimeout(this.seekTimeout);
    this.seekTimeout = setTimeout(async () => {
      const delta = this.pendingSeek;
      this.pendingSeek = 0;
      await this.command(["seek", delta, "relative"]);
    }, 80);
  }

  async setVolume(delta: number) {
    const next = Math.max(0, Math.min(130, this.status.volume + delta));
    this.status.volume = next;
    if (next > 0) this.status.muted = false;
    this.onStatusChange({ ...this.status });
    await this.command(["set_property", "volume", next]);
  }

  async toggleMute() {
    this.status.muted = !this.status.muted;
    this.onStatusChange({ ...this.status });
    await this.command(["set_property", "mute", this.status.muted]);
  }

  private async quitProcess() {
    if (this.seekTimeout) { clearTimeout(this.seekTimeout); this.seekTimeout = null; }
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
