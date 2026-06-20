import { MpvAudioPlayer } from "../infrastructure/audio/mpv-audio-player.js";
import { MusicMetadataReader } from "../infrastructure/metadata/music-metadata-reader.js";
import { LrcFileSource } from "../infrastructure/lyrics/lrc-file-source.js";
import { NodeFileSystem } from "../infrastructure/fs/node-file-system.js";
import { MathRandom } from "../infrastructure/random/math-random.js";
import { PlaybackCoordinator } from "../use-cases/playback-coordinator.js";
import { BrowseDirectory } from "../use-cases/browse-directory.js";

export type Container = {
  coordinator: PlaybackCoordinator;
  browseDirectory: BrowseDirectory;
};

/** DI manual: arma el grafo adapters → use cases. Sin frameworks ni decoradores. */
export function buildContainer(): Container {
  const random = new MathRandom();
  const audioPlayer = new MpvAudioPlayer();
  const metadataReader = new MusicMetadataReader();
  const lyricsSource = new LrcFileSource();
  const fileSystem = new NodeFileSystem();

  const coordinator = new PlaybackCoordinator(
    audioPlayer,
    metadataReader,
    lyricsSource,
    fileSystem,
    random,
  );
  const browseDirectory = new BrowseDirectory(fileSystem);

  return { coordinator, browseDirectory };
}
