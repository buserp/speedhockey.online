import { TICKRATE_MS, CANVAS_WIDTH, CANVAS_HEIGHT, PUCK_RADIUS, PLAYER1X, PLAYER2X, PADDLE_RADIUS } from "./constants";
import { Bodies, Composite, Engine, Body, Constraint, Vector } from "matter-js";
import { Server } from "socket.io";

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>({
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"]
    }
});

const engine = Engine.create({ gravity: { y: 0 } });

const wall_thickness = 50;

let puck = Bodies.circle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, PUCK_RADIUS, {
    friction: 0,
    frictionAir: 0,
    restitution: 1.0,
});

let player1 = Bodies.circle(PLAYER1X, CANVAS_HEIGHT / 2, PADDLE_RADIUS, { isStatic: true });
let player2 = Bodies.circle(PLAYER2X, CANVAS_HEIGHT / 2, PADDLE_RADIUS, { isStatic: true });


let ground = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + wall_thickness / 2, CANVAS_WIDTH, wall_thickness, { isStatic: true });
let ceiling = Bodies.rectangle(CANVAS_WIDTH / 2, -wall_thickness / 2, CANVAS_WIDTH, wall_thickness, { isStatic: true });

Composite.add(engine.world, [puck, ground, ceiling, player1, player2]);


let _state: GameState = {
    puckPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    player1Pos: { x: PLAYER1X, y: CANVAS_HEIGHT / 2 },
    player2Pos: { x: PLAYER2X, y: CANVAS_HEIGHT / 2 },
    redScore: 0,
    bluScore: 0,
};

io.on("connect", (socket) => {
    socket.on("updatePosition", (pos: Vector2, player: number) => {
        pos.y = clamp(pos.y, 0, CANVAS_HEIGHT);
        if (player == 0) {
            pos.x = clamp(pos.x, 0, CANVAS_WIDTH / 2 - PADDLE_RADIUS);
            // @ts-ignore (needed because type definitions for MatterJS are not correct)
            Body.setPosition(player1, pos, true);
        }
        else if (player == 1) {
            pos.x = clamp(pos.x, CANVAS_WIDTH / 2 + PADDLE_RADIUS, CANVAS_WIDTH);
            // @ts-ignore (needed because type definitions for MatterJS are not correct)
            Body.setPosition(player2, pos, true);
        }
    })
})

function resetPuck() {
    Body.setPosition(puck, { x: CANVAS_WIDTH / 2, y: Math.random() * CANVAS_HEIGHT });
    Body.setVelocity(puck, { x: 0, y: 0 });
}

function clamp(val: number, low: number, high: number): number {
    return Math.max(Math.min(val, high), low);
}

function output(dt: number) {
    Engine.update(engine, dt);
    if (puck.position.x < 0) {
        resetPuck();
        _state.bluScore += 1;
    }
    if (puck.position.x > CANVAS_WIDTH) {
        resetPuck();
        _state.redScore += 1;
    }
    _state.puckPos = puck.position;
    _state.player1Pos = player1.position;
    _state.player2Pos = player2.position;
    io.emit("updateGameState", _state);
}

setInterval(output, TICKRATE_MS);

console.log("running on port 3000...");
io.listen(3000);