import { Server, Socket } from "socket.io";

import { TICKRATE_MS, CANVAS_WIDTH, CANVAS_HEIGHT, PUCK_RADIUS } from "./constants";

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

let _puck: Puck = {
    x: 0,
    y: 0,
    dx: 2,
    dy: 2,
};

let _state: GameState = {
    puckPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    redScore: 0,
    bluScore: 0,
};

function tick(): void {
    // Bounce against edge of window
    if (_puck.x < 0) {
        _puck.dx = Math.abs(_puck.dx);
    }

    if (_puck.x > CANVAS_WIDTH - PUCK_RADIUS*2) {
        _puck.dx = -Math.abs(_puck.dx);
    }

    if (_puck.y < 0) {
        _puck.dy = Math.abs(_puck.dy);
    }

    if (_puck.y > CANVAS_HEIGHT - PUCK_RADIUS*2) {
        _puck.dy = -Math.abs(_puck.dy);
    }

    // Apply velocity
    _puck.x += _puck.dx;
    _puck.y += _puck.dy;

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
});

setInterval(() => {
    tick();
    io.emit("updateGameState", _state);
}, TICKRATE_MS);


console.log("running on port 3000...");
io.listen(3000);