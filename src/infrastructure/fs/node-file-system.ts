import * as fs from "fs";
import * as path from "path";
import { DirectoryEntry, FileSystem } from "../../ports/file-system.port.js";
import { isAudioFile } from "../../config/config.js";

/** Adapter de filesystem con fs sincrónico (suficiente para un TUI local). */
export class NodeFileSystem implements FileSystem {
  listEntries(dir: string): DirectoryEntry[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    const folders = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => new DirectoryEntry(e.name, path.join(dir, e.name), true));

    const files = entries
      .filter((e) => e.isFile() && isAudioFile(e.name))
      .map((e) => new DirectoryEntry(e.name, path.join(dir, e.name), false));

    return [...folders, ...files];
  }

  listAudioFiles(dir: string): string[] {
    return fs
      .readdirSync(dir)
      .filter((f) => isAudioFile(f))
      .sort()
      .map((f) => path.join(dir, f));
  }

  parentOf(dir: string): string {
    return path.dirname(dir);
  }
}
