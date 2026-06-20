/** Tags leídos de un archivo de audio. Campos vacíos ("") si no hay dato. */
export class TrackMetadata {
  constructor(
    readonly title: string,
    readonly artist: string,
    readonly album: string,
  ) {}

  static empty(): TrackMetadata {
    return new TrackMetadata("", "", "");
  }
}

/** Puerto para leer metadata (ID3, etc.) de un archivo de audio. */
export interface MetadataReader {
  read(filePath: string): Promise<TrackMetadata>;
}
