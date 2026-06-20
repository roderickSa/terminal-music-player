import { Track } from "../library/track.js";
import { Lyrics } from "../lyrics/lyrics.js";
import { RepeatMode } from "./repeat-mode.js";

/** Snapshot inmutable del estado de reproducción. Es lo que renderiza la UI. */
export class PlayerState {
  constructor(
    readonly playing: boolean,
    readonly position: number,
    readonly duration: number,
    readonly volume: number,
    readonly muted: boolean,
    readonly track: Track,
    readonly currentIndex: number,
    readonly total: number,
    readonly shuffle: boolean,
    readonly repeat: RepeatMode,
    readonly lyrics: Lyrics,
  ) {}

  static initial(): PlayerState {
    return new PlayerState(
      false,
      0,
      0,
      100,
      false,
      Track.empty(),
      0,
      0,
      false,
      RepeatMode.OFF,
      Lyrics.empty(),
    );
  }

  hasTrack(): boolean {
    return this.track.path.length > 0;
  }
}
