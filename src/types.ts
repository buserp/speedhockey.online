export interface ServerToClientEvents {
  updateGameState: (state: ServerState) => void;
}

export interface ClientToServerEvents {
  requestPosition: (pos: Vector2) => void;
  joinTeam: (team: Team, pos: Vector2) => void;
}

export interface InterServerEvents {}
export interface SocketData {}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  position: Vector2;
  team: Team;
}

export enum Team {
  SPECTATOR = -1,
  RED,
  BLU,
}

export interface ServerState {
  puckPos: Vector2;
  players: { [id: string]: Player };
  redScore: number;
  bluScore: number;
}
