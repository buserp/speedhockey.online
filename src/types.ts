interface ServerToClientEvents {
    assignSlot: (slot: number) => void;
    updateGameState: (state: GameState) => void;
}

interface ClientToServerEvents {
    updatePosition: (pos: Vector2, player: number) => void;
}

interface InterServerEvents { }
interface SocketData { }

type Vector2 = {
    x: number,
    y: number,
};

type GameState = {
    puckPos: Vector2,
    player1Pos: Vector2,
    player2Pos: Vector2,
    redScore: number,
    bluScore: number,
};