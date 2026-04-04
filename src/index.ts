import { render } from "ink";
import React from "react";
import { App } from "./ui/App.js";
import { MPVPlayer } from "./audio/mpv.js";

// Leer el archivo desde los argumentos
const filePath = process.argv[2];

const player = new MPVPlayer((status) => {});

const { waitUntilExit } = render(React.createElement(App, { player, filePath }));

await waitUntilExit();
await player.quit();
