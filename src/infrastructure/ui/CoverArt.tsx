import { Box, Text } from "ink";
import { useState, useEffect } from "react";
import terminalImage from "terminal-image";
import { AlbumArtReader } from "../../ports/album-art.port.js";

/**
 * Carátula del álbum. Renderiza la portada embebida con terminal-image
 * (Kitty/iTerm2/half-blocks según el terminal); si no hay arte o el terminal
 * no soporta gráficos, muestra un placeholder.
 */
export function CoverArt({
  reader,
  trackPath,
  size,
}: {
  reader: AlbumArtReader;
  trackPath: string;
  size: number;
}) {
  const [art, setArt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setArt(null);
    if (!trackPath) return;

    reader.read(trackPath).then(async (data) => {
      if (cancelled || !data) return;
      try {
        const rendered = await terminalImage.buffer(Buffer.from(data), {
          width: size,
          height: size,
          preserveAspectRatio: true,
        });
        if (!cancelled) setArt(rendered);
      } catch {
        // terminal sin soporte de imagen: queda el placeholder
      }
    });

    return () => {
      cancelled = true;
    };
  }, [trackPath, reader, size]);

  if (!art) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        width={size + 2}
        height={size + 2}
        alignItems="center"
        justifyContent="center"
      >
        <Text color="magenta">♪</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>{art}</Text>
    </Box>
  );
}
