import { DirectoryEntry, FileSystem } from "../ports/file-system.port.js";

/** Caso de uso del file browser: listar un directorio y subir al padre. */
export class BrowseDirectory {
  constructor(private readonly fileSystem: FileSystem) {}

  list(dir: string): DirectoryEntry[] {
    return this.fileSystem.listEntries(dir);
  }

  parentOf(dir: string): string {
    return this.fileSystem.parentOf(dir);
  }
}
