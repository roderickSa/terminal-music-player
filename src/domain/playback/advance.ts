/** Resultado de avanzar al terminar una pista: o cargamos otra, o paramos. */
export class AdvanceToTrack {
  constructor(readonly index: number) {}
}

export class StopPlayback {}

export type Advance = AdvanceToTrack | StopPlayback;
