/** Entrada de un directorio: carpeta navegable o archivo de audio. */
export class DirectoryEntry {
  constructor(
    readonly name: string,
    readonly path: string,
    readonly isDirectory: boolean,
  ) {}
}

/** Puerto de acceso al filesystem (listar para el browser y armar la playlist). */
export interface FileSystem {
  /** Carpetas (no ocultas) + archivos de audio del directorio, para el browser. */
  listEntries(dir: string): DirectoryEntry[];
  /** Rutas de audio del directorio, ordenadas, para construir la playlist. */
  listAudioFiles(dir: string): string[];
  /** Directorio padre. */
  parentOf(dir: string): string;
}
