import { describe, it, expect } from "vitest";
import { RepeatMode } from "./repeat-mode.js";

describe("RepeatMode", () => {
  it("cicla off → all → one → off", () => {
    expect(RepeatMode.OFF.next()).toBe(RepeatMode.ALL);
    expect(RepeatMode.ALL.next()).toBe(RepeatMode.ONE);
    expect(RepeatMode.ONE.next()).toBe(RepeatMode.OFF);
  });

  it("expone el value y los predicados", () => {
    expect(RepeatMode.ALL.value).toBe("all");
    expect(RepeatMode.ONE.isOne()).toBe(true);
    expect(RepeatMode.OFF.isOff()).toBe(true);
  });
});
