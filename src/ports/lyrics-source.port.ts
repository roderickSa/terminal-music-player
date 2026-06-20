import { Lyrics } from "../domain/lyrics/lyrics.js";

/** Puerto para obtener las letras de una pista (devuelve Lyrics.empty() si no hay). */
export interface LyricsSource {
  loadFor(audioPath: string): Promise<Lyrics>;
}
