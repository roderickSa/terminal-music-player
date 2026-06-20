import { AudioPlayer, PlaybackSnapshot } from "../../ports/audio-player.port.js";
import { MetadataReader, TrackMetadata } from "../../ports/metadata-reader.port.js";
import { LyricsSource } from "../../ports/lyrics-source.port.js";
import { DirectoryEntry, FileSystem } from "../../ports/file-system.port.js";
import { Random } from "../../ports/random.port.js";
import { Lyrics } from "../../domain/lyrics/lyrics.js";

export class FakeAudioPlayer implements AudioPlayer {
  played: string[] = [];
  restarted = 0;
  paused = 0;
  private snapshotListener: (s: PlaybackSnapshot) => void = () => {};
  private trackEndedListener: () => void = () => {};

  async play(filePath: string): Promise<void> {
    this.played.push(filePath);
  }
  async stop(): Promise<void> {}
  async dispose(): Promise<void> {}
  async togglePause(): Promise<void> {
    this.paused++;
  }
  async seekRelative(): Promise<void> {}
  async restart(): Promise<void> {
    this.restarted++;
  }
  async changeVolume(): Promise<void> {}
  async toggleMuted(): Promise<void> {}

  onSnapshot(listener: (s: PlaybackSnapshot) => void): void {
    this.snapshotListener = listener;
  }
  onTrackEnded(listener: () => void): void {
    this.trackEndedListener = listener;
  }

  emitSnapshot(snapshot: PlaybackSnapshot): void {
    this.snapshotListener(snapshot);
  }
  emitTrackEnded(): void {
    this.trackEndedListener();
  }
  lastPlayed(): string {
    return this.played[this.played.length - 1];
  }
}

export class FakeMetadataReader implements MetadataReader {
  constructor(private readonly metadata: TrackMetadata) {}
  async read(): Promise<TrackMetadata> {
    return this.metadata;
  }
}

export class FakeLyricsSource implements LyricsSource {
  constructor(private readonly lyrics: Lyrics) {}
  async loadFor(): Promise<Lyrics> {
    return this.lyrics;
  }
}

export class FakeFileSystem implements FileSystem {
  constructor(private readonly audioFiles: string[]) {}
  listEntries(): DirectoryEntry[] {
    return this.audioFiles.map((p) => new DirectoryEntry(p, p, false));
  }
  listAudioFiles(): string[] {
    return this.audioFiles;
  }
  parentOf(): string {
    return "/";
  }
}

export class ScriptedRandom implements Random {
  private calls = 0;
  constructor(private readonly values: number[] = []) {}
  intBelow(): number {
    return this.values[this.calls++] ?? 0;
  }
}
