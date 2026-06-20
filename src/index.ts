import { render } from "ink";
import React from "react";
import { spawnSync } from "child_process";
import * as fs from "fs";
import { App } from "./ui/App.js";
import { MPVPlayer } from "./audio/mpv.js";
import { resolveStartDir } from "./config.js";

function mpvAvailable(): boolean {
  try {
    return spawnSync("mpv", ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

if (!mpvAvailable()) {
  console.error(`
  ✖  No se encontró "mpv" en el PATH.

  Instálalo y vuelve a intentar:
    Ubuntu/Debian   sudo apt install mpv
    Arch            sudo pacman -S mpv
    Fedora          sudo dnf install mpv
    macOS           brew install mpv
`);
  process.exit(1);
}

// Tomamos el último argumento posicional: así `npm run dev` usa el default
// del script (src/music) y `npm run dev -- /otra/ruta` lo sobrescribe.
const args = process.argv.slice(2);
const arg = args[args.length - 1];
const argIsFile = !!arg && fs.existsSync(arg) && fs.statSync(arg).isFile();

const filePath = argIsFile ? arg : undefined;
const startDir = resolveStartDir(arg);

const player = new MPVPlayer((status) => {});

const { waitUntilExit } = render(
  React.createElement(App, { player, filePath, startDir })
);

await waitUntilExit();
await player.quit();
