import { Random } from "../../ports/random.port.js";

export class MathRandom implements Random {
  intBelow(maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive);
  }
}
