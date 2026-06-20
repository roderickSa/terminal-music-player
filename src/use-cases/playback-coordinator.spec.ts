import { describe, it, expect, beforeEach } from "vitest";
import { PlaybackCoordinator } from "./playback-coordinator.js";
import {
  FakeAudioPlayer,
  FakeMetadataReader,
  FakeLyricsSource,
  FakeFileSystem,
  ScriptedRandom,
} from "./test-doubles/fakes.js";
import { TrackMetadata } from "../ports/metadata-reader.port.js";
import { PlaybackSnapshot } from "../ports/audio-player.port.js";
import { Lyrics } from "../domain/lyrics/lyrics.js";
import { LyricLine } from "../domain/lyrics/lyric-line.js";

const FILES = ["/m/a.mp3", "/m/b.mp3", "/m/c.mp3"];
const tick = () => new Promise((r) => setTimeout(r, 0));

let audio: FakeAudioPlayer;
let coordinator: PlaybackCoordinator;

function build(metadata: TrackMetadata, lyrics: Lyrics): PlaybackCoordinator {
  audio = new FakeAudioPlayer();
  return new PlaybackCoordinator(
    audio,
    new FakeMetadataReader(metadata),
    new FakeLyricsSource(lyrics),
    new FakeFileSystem(FILES),
    new ScriptedRandom(),
  );
}

beforeEach(() => {
  coordinator = build(new TrackMetadata("Title", "Artist", "Album"), Lyrics.of([new LyricLine(0, "x")]));
});

describe("PlaybackCoordinator.playTrack", () => {
  it("arma la playlist y reproduce la pista pedida", async () => {
    await coordinator.playTrack("/m/b.mp3");
    expect(audio.lastPlayed()).toBe("/m/b.mp3");
    expect(coordinator.currentState().currentIndex).toBe(1);
    expect(coordinator.currentState().total).toBe(3);
  });

  it("enriquece con tags + letras tras cargar", async () => {
    await coordinator.playTrack("/m/a.mp3");
    await tick();
    const state = coordinator.currentState();
    expect(state.track.title).toBe("Title");
    expect(state.track.artist).toBe("Artist");
    expect(state.track.album).toBe("Album");
    expect(state.lyrics.isEmpty()).toBe(false);
  });

  it("cae al nombre de archivo cuando no hay tags (fallback)", async () => {
    coordinator = build(new TrackMetadata("", "", ""), Lyrics.empty());
    await coordinator.playTrack("/m/a.mp3");
    await tick();
    expect(coordinator.currentState().track.title).toBe("a");
  });
});

describe("PlaybackCoordinator.next / previous", () => {
  it("next reproduce la siguiente", async () => {
    await coordinator.playTrack("/m/a.mp3");
    await coordinator.next();
    expect(audio.lastPlayed()).toBe("/m/b.mp3");
  });

  it("previous reinicia si lleva más de 3s", async () => {
    await coordinator.playTrack("/m/b.mp3");
    audio.emitSnapshot(new PlaybackSnapshot(10, 200, true, 100, false));
    await coordinator.previous();
    expect(audio.restarted).toBe(1);
    expect(audio.lastPlayed()).toBe("/m/b.mp3"); // no cambió de pista
  });

  it("previous va a la anterior si lleva poco", async () => {
    await coordinator.playTrack("/m/b.mp3");
    audio.emitSnapshot(new PlaybackSnapshot(1, 200, true, 100, false));
    await coordinator.previous();
    expect(audio.lastPlayed()).toBe("/m/a.mp3");
  });
});

describe("PlaybackCoordinator.onTrackEnded", () => {
  it("en la última con repeat off marca pausado y no reproduce más", async () => {
    await coordinator.playTrack("/m/c.mp3");
    audio.emitTrackEnded();
    await tick();
    expect(coordinator.currentState().playing).toBe(false);
    expect(audio.played).toEqual(["/m/c.mp3"]); // no avanzó
  });
});

describe("PlaybackCoordinator modos", () => {
  it("toggleShuffle y cycleRepeat se reflejan en el estado", () => {
    coordinator.toggleShuffle();
    expect(coordinator.currentState().shuffle).toBe(true);
    coordinator.cycleRepeat();
    expect(coordinator.currentState().repeat.value).toBe("all");
  });
});
