import * as path from "path";

/** Pista con su metadata. Campos vacíos ("") cuando no hay dato; nunca undefined. */
export class Track {
  constructor(
    readonly path: string,
    readonly title: string,
    readonly artist: string,
    readonly album: string,
  ) {}

  static empty(): Track {
    return new Track("", "", "", "");
  }

  /** Pista sin tags todavía: el título es el nombre de archivo sin extensión. */
  static fromPath(filePath: string): Track {
    const base = path.basename(filePath).replace(/\.[^/.]+$/, "");
    return new Track(filePath, base, "", "");
  }

  withMetadata(title: string, artist: string, album: string): Track {
    return new Track(this.path, title || this.title, artist, album);
  }

  hasArtist(): boolean {
    return this.artist.length > 0;
  }

  hasAlbum(): boolean {
    return this.album.length > 0;
  }
}
