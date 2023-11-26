interface ServerToClientEvents {
    assignSlot: (slot: number) => void;
    updateGameState: (state: GameState) => void;
}

interface ClientToServerEvents {
    updatePosition: (pos: Vector2) => void;
}

interface InterServerEvents { }

interface SocketData { }

// Because vanilla socket.io can't serialize a bigint
type BigIntStr = string;

type Vector2 = {
    x: number,
    y: number,
};

type GameState = {
    puckPos: Vector2,
    redScore: number,
    bluScore: number,
};