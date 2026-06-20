import * as path from "path";
import { AudioPlayer, PlaybackSnapshot } from "../ports/audio-player.port.js";
import { MetadataReader } from "../ports/metadata-reader.port.js";
import { LyricsSource } from "../ports/lyrics-source.port.js";
import { FileSystem } from "../ports/file-system.port.js";
import { Random } from "../ports/random.port.js";
import { Playlist } from "../domain/playback/playlist.js";
import { PlayerState } from "../domain/playback/player-state.js";
import { AdvanceToTrack, StopPlayback } from "../domain/playback/advance.js";
import { Track } from "../domain/library/track.js";
import { Lyrics } from "../domain/lyrics/lyrics.js";
import { exhaustive } from "../shared/exhaustive.js";

/** Segundos reproducidos a partir de los cuales "anterior" reinicia la pista. */
const RESTART_THRESHOLD = 3;

type StateListener = (state: PlayerState) => void;

/**
 * Orquesta la reproducción: une la Playlist (dominio) con el AudioPlayer y los
 * puertos de metadata/letras, y publica un PlayerState observable a la UI.
 * Sus métodos públicos SON los casos de uso de la app.
 */
export class PlaybackCoordinator {
  private playlist: Playlist;
  private snapshot = new PlaybackSnapshot(0, 0, false, 100, false);
  private track = Track.empty();
  private lyrics = Lyrics.empty();
  private listener: StateListener = () => {};

  constructor(
    private readonly audio: AudioPlayer,
    private readonly metadata: MetadataReader,
    private readonly lyricsSource: LyricsSource,
    private readonly fileSystem: FileSystem,
    private readonly random: Random,
  ) {
    this.playlist = Playlist.empty(random);
    this.audio.onSnapshot((snapshot) => this.onSnapshot(snapshot));
    this.audio.onTrackEnded(() => void this.onTrackEnded());
  }

  subscribe(listener: StateListener): void {
    this.listener = listener;
  }

  currentState(): PlayerState {
    return this.buildState();
  }

  async playTrack(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    const paths = this.fileSystem.listAudioFiles(dir);
    this.playlist = Playlist.fromPaths(
      paths,
      filePath,
      this.playlist.shuffle(),
      this.playlist.repeat(),
      this.random,
    );
    await this.loadCurrent();
  }

  async next(): Promise<void> {
    if (this.playlist.isEmpty()) return;
    this.playlist.selectNext();
    await this.loadCurrent();
  }

  async previous(): Promise<void> {
    if (this.playlist.isEmpty()) return;
    if (this.snapshot.position > RESTART_THRESHOLD) {
      await this.audio.restart();
      return;
    }
    this.playlist.selectPrevious();
    await this.loadCurrent();
  }

  async togglePause(): Promise<void> {
    await this.audio.togglePause();
  }

  async seek(seconds: number): Promise<void> {
    await this.audio.seekRelative(seconds);
  }

  async changeVolume(delta: number): Promise<void> {
    await this.audio.changeVolume(delta);
  }

  async toggleMute(): Promise<void> {
    await this.audio.toggleMuted();
  }

  toggleShuffle(): void {
    this.playlist.toggleShuffle();
    this.emit();
  }

  cycleRepeat(): void {
    this.playlist.cycleRepeat();
    this.emit();
  }

  async stop(): Promise<void> {
    await this.audio.stop();
  }

  private async loadCurrent(): Promise<void> {
    if (this.playlist.isEmpty()) return;
    const trackPath = this.playlist.currentPath();

    this.track = Track.fromPath(trackPath);
    this.lyrics = Lyrics.empty();
    this.emit();

    await this.audio.play(trackPath);
    void this.enrich(trackPath);
  }

  /** Carga tags + letras en segundo plano; descarta si ya cambió la pista. */
  private async enrich(trackPath: string): Promise<void> {
    const [metadata, lyrics] = await Promise.all([
      this.metadata.read(trackPath),
      this.lyricsSource.loadFor(trackPath),
    ]);
    if (this.playlist.currentPath() !== trackPath) return;
    this.track = this.track.withMetadata(metadata.title, metadata.artist, metadata.album);
    this.lyrics = lyrics;
    this.emit();
  }

  private onSnapshot(snapshot: PlaybackSnapshot): void {
    this.snapshot = snapshot;
    this.emit();
  }

  private async onTrackEnded(): Promise<void> {
    const advance = this.playlist.advanceAfterEnd();
    if (advance instanceof StopPlayback) {
      this.snapshot = new PlaybackSnapshot(
        this.snapshot.position,
        this.snapshot.duration,
        false,
        this.snapshot.volume,
        this.snapshot.muted,
      );
      this.emit();
      return;
    }
    if (advance instanceof AdvanceToTrack) {
      await this.loadCurrent();
      return;
    }
    exhaustive(advance);
  }

  private buildState(): PlayerState {
    return new PlayerState(
      this.snapshot.playing,
      this.snapshot.position,
      this.snapshot.duration,
      this.snapshot.volume,
      this.snapshot.muted,
      this.track,
      this.playlist.currentIndex(),
      this.playlist.size(),
      this.playlist.shuffle(),
      this.playlist.repeat(),
      this.lyrics,
    );
  }

  private emit(): void {
    this.listener(this.buildState());
  }
}
