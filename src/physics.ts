import { TICKRATE_MS, CANVAS_WIDTH, CANVAS_HEIGHT, PUCK_RADIUS, PLAYER1X, PLAYER2X, PADDLE_HEIGHT, PADDLE_WIDTH } from "./constants";
import { Bodies, Composite, Engine, Body } from "matter-js";
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

let puck = Bodies.circle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, PUCK_RADIUS);
let player1 = Bodies.rectangle(PLAYER1X, CANVAS_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT)
let player2 = Bodies.rectangle(PLAYER2X, CANVAS_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT)
Body.applyForce(puck, { x: 0, y: 0 }, { x: 0.02, y: 0.02 });
let ground = Bodies.rectangle(0, 0, CANVAS_WIDTH, wall_thickness, { isStatic: true, position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT+wall_thickness/2 } });
let ceiling = Bodies.rectangle(0, 0, CANVAS_WIDTH, wall_thickness, { isStatic: true, position: { x: CANVAS_WIDTH / 2, y: -wall_thickness } });

Composite.add(engine.world, [puck, ground, ceiling, player1, player2]);


let _state: GameState = {
    puckPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    player1Pos: { x: PLAYER1X, y: CANVAS_HEIGHT / 2 },
    player2Pos: { x: PLAYER2X, y: CANVAS_HEIGHT / 2 },
    redScore: 0,
    bluScore: 0,
};

Body.applyForce(player1, { x: 0, y: 0 }, { x: 0.01, y: -0.01 });

io.on("connect", (socket) => {
    socket.on("updatePosition", (pos: Vector2, player: number) => {
        if (player == 0) {
            Body.setPosition(player1, pos);
        }
        else if (player == 1) {
            Body.setPosition(player2, pos);
        }
    })
})

function output(dt: number) {
    Engine.update(engine, dt);
    _state.puckPos = puck.position;
    _state.player1Pos = player1.position;
    _state.player2Pos = player2.position;
    io.emit("updateGameState", _state);
}

setInterval(output, TICKRATE_MS);

io.listen(3000);