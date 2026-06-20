/** Una línea de letra sincronizada. */
export class LyricLine {
  constructor(
    readonly time: number, // segundos
    readonly text: string,
  ) {}
}
