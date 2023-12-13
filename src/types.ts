interface ServerToClientEvents {
    updateGameState: (state: GameState) => void;
}

interface ClientToServerEvents {
    updatePosition: (pos: Vector2) => void;
    joinTeam: (team: number | null) => void;
}

interface InterServerEvents { }
interface SocketData { }

type Vector2 = {
    x: number,
    y: number,
};

type GameState = {
    puckPos: Vector2,
    redPlayers: { [id: string]: Vector2 },
    bluPlayers: { [id: string]: Vector2 },
    redScore: number,
    bluScore: number,
};