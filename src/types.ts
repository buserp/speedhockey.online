export interface ServerToClientEvents {
    updateGameState: (state: GameState) => void;
}

export interface ClientToServerEvents {
    updatePosition: (pos: Vector2) => void;
    joinTeam: (team: Team) => void;
}

export interface InterServerEvents { }
export interface SocketData { }

export type Vector2 = {
    x: number,
    y: number,
};

export type Player = {
    position: Vector2,
    team: Team,
};

export enum Team {
    SPECTATOR = -1,
    RED,
    BLU,
};

export type GameState = {
    puckPos: Vector2,
    players: { [id: string]: Player },
    redScore: number,
    bluScore: number,
};