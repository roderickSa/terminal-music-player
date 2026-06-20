/** Fuente de aleatoriedad inyectable (para que el shuffle sea testeable). */
export interface Random {
  /** Entero en [0, maxExclusive). */
  intBelow(maxExclusive: number): number;
}
