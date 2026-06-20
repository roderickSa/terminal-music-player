/** Foto del transporte de audio en un instante (lo que reporta el reproductor). */
export class PlaybackSnapshot {
  constructor(
    readonly position: number,
    readonly duration: number,
    readonly playing: boolean,
    readonly volume: number,
    readonly muted: boolean,
  ) {}
}

/**
 * Puerto del reproductor de audio: SOLO transporte (reproducir un archivo,
 * pausar, buscar, volumen). No sabe de playlists, shuffle ni repeat.
 * El adapter persiste volumen/mute entre pistas.
 */
export interface AudioPlayer {
  play(filePath: string): Promise<void>;
  stop(): Promise<void>;
  togglePause(): Promise<void>;
  seekRelative(seconds: number): Promise<void>;
  restart(): Promise<void>;
  changeVolume(delta: number): Promise<void>;
  toggleMuted(): Promise<void>;

  onSnapshot(listener: (snapshot: PlaybackSnapshot) => void): void;
  onTrackEnded(listener: () => void): void;

  dispose(): Promise<void>;
}
