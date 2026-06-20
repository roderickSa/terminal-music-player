import { parseFile } from "music-metadata";
import { AlbumArtReader } from "../../ports/album-art.port.js";

/** Lee la portada embebida (APIC/cover) con music-metadata. */
export class MusicMetadataArtReader implements AlbumArtReader {
  async read(audioPath: string): Promise<Uint8Array | null> {
    try {
      const { common } = await parseFile(audioPath);
      const picture = common.picture?.[0];
      return picture ? picture.data : null;
    } catch {
      return null;
    }
  }
}
