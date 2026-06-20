export type RepeatModeValue = "off" | "all" | "one";

/** Modo de repetición como value object cíclico: off → all → one → off. */
export class RepeatMode {
  static readonly OFF = new RepeatMode("off");
  static readonly ALL = new RepeatMode("all");
  static readonly ONE = new RepeatMode("one");

  private static readonly ORDER: readonly RepeatMode[] = [
    RepeatMode.OFF,
    RepeatMode.ALL,
    RepeatMode.ONE,
  ];

  private constructor(readonly value: RepeatModeValue) {}

  next(): RepeatMode {
    const index = RepeatMode.ORDER.indexOf(this);
    return RepeatMode.ORDER[(index + 1) % RepeatMode.ORDER.length];
  }

  isOff(): boolean {
    return this === RepeatMode.OFF;
  }

  isAll(): boolean {
    return this === RepeatMode.ALL;
  }

  isOne(): boolean {
    return this === RepeatMode.ONE;
  }
}
