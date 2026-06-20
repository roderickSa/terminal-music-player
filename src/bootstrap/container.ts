import { spawnSync } from "child_process";
import { MpvAudioPlayer } from "../infrastructure/audio/mpv-audio-player.js";
import { MusicMetadataReader } from "../infrastructure/metadata/music-metadata-reader.js";
import { MusicMetadataArtReader } from "../infrastructure/metadata/music-metadata-art-reader.js";
import { LrcFileSource } from "../infrastructure/lyrics/lrc-file-source.js";
import { NodeFileSystem } from "../infrastructure/fs/node-file-system.js";
import { MathRandom } from "../infrastructure/random/math-random.js";
import { SimulatedSpectrum } from "../infrastructure/spectrum/simulated-spectrum.js";
import { CavaSpectrum } from "../infrastructure/spectrum/cava-spectrum.js";
import { Spectrum } from "../ports/spectrum.port.js";
import { AlbumArtReader } from "../ports/album-art.port.js";
import { PlaybackCoordinator } from "../use-cases/playback-coordinator.js";
import { BrowseDirectory } from "../use-cases/browse-directory.js";

export type Container = {
  coordinator: PlaybackCoordinator;
  browseDirectory: BrowseDirectory;
  spectrum: Spectrum;
  albumArt: AlbumArtReader;
};

function cavaAvailable(): boolean {
  try {
    return spawnSync("cava", ["-v"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

/** DI manual: arma el grafo adapters → use cases. Sin frameworks ni decoradores. */
export function buildContainer(): Container {
  const random = new MathRandom();
  const audioPlayer = new MpvAudioPlayer();
  const metadataReader = new MusicMetadataReader();
  const lyricsSource = new LrcFileSource();
  const fileSystem = new NodeFileSystem();
  const spectrum: Spectrum = cavaAvailable() ? new CavaSpectrum() : new SimulatedSpectrum();

  const coordinator = new PlaybackCoordinator(
    audioPlayer,
    metadataReader,
    lyricsSource,
    fileSystem,
    random,
  );
  const browseDirectory = new BrowseDirectory(fileSystem);
  const albumArt = new MusicMetadataArtReader();

  return { coordinator, browseDirectory, spectrum, albumArt };
}
