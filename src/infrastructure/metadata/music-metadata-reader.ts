import { parseFile } from "music-metadata";
import { MetadataReader, TrackMetadata } from "../../ports/metadata-reader.port.js";

/** Adapter de music-metadata: traduce los tags a TrackMetadata (sin undefined). */
export class MusicMetadataReader implements MetadataReader {
  async read(filePath: string): Promise<TrackMetadata> {
    try {
      const { common } = await parseFile(filePath);
      return new TrackMetadata(
        common.title ?? "",
        common.artist ?? "",
        common.album ?? "",
      );
    } catch {
      return TrackMetadata.empty();
    }
  }
}
