import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const AUDIO_EXTENSIONS = [".mp3", ".flac", ".ogg", ".wav", ".m4a", ".aac"];

export function isAudioFile(file: string): boolean {
  return AUDIO_EXTENSIONS.includes(path.extname(file).toLowerCase());
}

/** ¿Hay algo que mostrar en el picker (audio o subcarpetas para navegar)? */
function hasBrowsableContent(dir: string): boolean {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.some(
      (e) =>
        (e.isDirectory() && !e.name.startsWith(".")) ||
        (e.isFile() && isAudioFile(e.name))
    );
  } catch {
    return false;
  }
}

/**
 * Resuelve el directorio inicial del file browser en cascada:
 *   1. arg de CLI (si es un directorio, o el directorio del archivo dado) — explícito
 *   2. env MUSIC_DIR — explícito
 *   3. ~/Music — solo si tiene contenido navegable (no dejar el picker vacío)
 *   4. directorio de trabajo actual
 *
 * arg y MUSIC_DIR se respetan aunque estén vacíos (el usuario los pidió);
 * el ~/Music implícito se omite si no hay nada que listar.
 */
export function resolveStartDir(arg?: string): string {
  if (arg && fs.existsSync(arg)) {
    const stat = fs.statSync(arg);
    if (stat.isDirectory()) return arg;
    if (stat.isFile()) return path.dirname(arg);
  }

  const env = process.env.MUSIC_DIR;
  if (env && fs.existsSync(env)) return env;

  const musicDir = path.join(os.homedir(), "Music");
  if (fs.existsSync(musicDir) && hasBrowsableContent(musicDir)) return musicDir;

  return process.cwd();
}
