import { Server } from "socket.io";
import { TICKRATE_MS, CANVAS_WIDTH, CANVAS_HEIGHT, PUCK_RADIUS, PLAYER1X, PLAYER2X, PADDLE_HEIGHT, PADDLE_WIDTH } from "./constants";

type Puck = {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>({
    cors: {
        origin: "http://localhost:1234",
        methods: ["GET", "POST"]
    }
});

let randAngle = Math.random() * 2 * Math.PI;
let speed = 5;

let _puck: Puck = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    dx: Math.sin(randAngle) * speed,
    dy: Math.cos(randAngle) * speed,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

let _state: GameState = {
    puckPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    player1Pos: { x: PLAYER1X, y: CANVAS_HEIGHT / 2 },
    player2Pos: { x: PLAYER2X, y: CANVAS_HEIGHT / 2 },
    redScore: 0,
    bluScore: 0,
};

function contains(value: number, min: number, max: number): boolean {
    return value > min && value < max;
}

function tick(): void {
    // Bounce against edge of window
    if (_puck.x - (PUCK_RADIUS / 2) < 0) {
        _puck.dx = Math.abs(_puck.dx);
        _state.bluScore += 1;
    }

    if (_puck.x + (PUCK_RADIUS / 2) > CANVAS_WIDTH) {
        _puck.dx = -Math.abs(_puck.dx);
        _state.redScore += 1;
    }

    if (_puck.y - (PUCK_RADIUS / 2) < 0) {
        _puck.dy = Math.abs(_puck.dy);
    }

    if (_puck.y + (PUCK_RADIUS / 2) > CANVAS_HEIGHT) {
        _puck.dy = -Math.abs(_puck.dy);
    }

    // Apply velocity
    _puck.x += _puck.dx;
    _puck.y += _puck.dy;

    if (_puck.dx < 0 &&
        contains(_puck.y, _state.player1Pos.y, _state.player1Pos.y + PADDLE_HEIGHT) &&
        contains(_puck.x, _state.player1Pos.x, _state.player1Pos.x + PADDLE_WIDTH)) {
        _puck.dx = Math.abs(_puck.dx);
    }

    if (_puck.dx > 0 &&
        contains(_puck.y, _state.player2Pos.y, _state.player2Pos.y + PADDLE_HEIGHT) &&
        contains(_puck.x, _state.player2Pos.x, _state.player2Pos.x + PADDLE_WIDTH)) {
        _puck.dx = -Math.abs(_puck.dx);
    }

    // Update state
    _state.puckPos = {
        x: _puck.x,
        y: _puck.y,
    };
}

io.on("connect", (socket) => {
    console.log(socket.id + " connected");
    socket.on("disconnect", () => {
        console.log(socket.id + " disconnected");
    });
    socket.on("updatePosition", (pos, player) => {
        if (player == 0) {
            _state.player1Pos.x = PLAYER1X;
            _state.player1Pos.y = clamp(pos.y, 0, CANVAS_HEIGHT - PADDLE_HEIGHT);

        }
        else {
            _state.player2Pos.x = PLAYER2X;
            _state.player2Pos.y = clamp(pos.y, 0, CANVAS_HEIGHT - PADDLE_HEIGHT);
        }
    });
});

setInterval(() => {
    tick();
    io.emit("updateGameState", _state);
}, TICKRATE_MS);


console.log("running on port 3000...");
io.listen(3000);