/** Puerto para obtener la carátula embebida de un archivo de audio. */
export interface AlbumArtReader {
  /** Bytes de la imagen de portada, o null si no hay. */
  read(audioPath: string): Promise<Uint8Array | null>;
}
