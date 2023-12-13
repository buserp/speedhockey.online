import { TICKRATE_MS, ARENA_WIDTH, ARENA_HEIGHT, PUCK_RADIUS, PADDLE_RADIUS, MAX_PLAYER_MOVE_DISTANCE, clamp } from "./constants";
import { Bodies, Composite, Engine, Body } from "matter-js";
import { Server } from "socket.io";


const engine = Engine.create({ gravity: { y: 0 } });
const wall_thickness = 50;

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


let puck = Bodies.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, PUCK_RADIUS, {
    friction: 0,
    frictionAir: 0.0075,
    restitution: 1.0,
    mass: 20.0,
});

const ground = Bodies.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT + wall_thickness / 2, ARENA_WIDTH, wall_thickness, { isStatic: true });
const ceiling = Bodies.rectangle(ARENA_WIDTH / 2, -wall_thickness / 2, ARENA_WIDTH, wall_thickness, { isStatic: true });

Composite.add(engine.world, [puck, ground, ceiling]);


let state: GameState = {
    puckPos: puck.position,
    redPlayers: {},
    bluPlayers: {},
    redScore: 0,
    bluScore: 0,
};

io.on("connect", (socket) => {
    socket.on("updatePosition", (pos: Vector2) => {
        const player = playerNumber == 0 ? player1 : player2;

        pos.y = clamp(pos.y, 0, ARENA_HEIGHT);
        if (player == player1) {
            pos.x = clamp(pos.x, 0, ARENA_WIDTH / 2);
        } else {
            pos.x = clamp(pos.x, ARENA_WIDTH / 2, ARENA_WIDTH);
        }

        const deltaX = pos.x - player.position.x;
        const deltaY = pos.y - player.position.y;
        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

        if (distance > MAX_PLAYER_MOVE_DISTANCE) {
            const directionX = deltaX / distance;
            const directionY = deltaY / distance;
            const newX = player.position.x + directionX * MAX_PLAYER_MOVE_DISTANCE;
            const newY = player.position.y + directionY * MAX_PLAYER_MOVE_DISTANCE;
            // @ts-ignore (needed because type definitions for MatterJS are not correct)
            Body.setPosition(player, { x: newX, y: newY }, true);
        } else {
            // @ts-ignore (needed because type definitions for MatterJS are not correct)
            Body.setPosition(player, pos, true);
        }

    })
})

function resetPuck() {
    Body.setPosition(puck, { x: ARENA_WIDTH / 2, y: Math.random() * ARENA_HEIGHT });
    Body.setVelocity(puck, { x: 0, y: 0 });
    Body.setAngularSpeed(puck, 0);
}

function tick(dt: number) {
    Engine.update(engine, dt);
    if (puck.position.x < 0) {
        resetPuck();
        state.bluScore += 1;
    }
    if (puck.position.x > ARENA_WIDTH) {
        resetPuck();
        state.redScore += 1;
    }
    puck.position.y = clamp(puck.position.y, 0, ARENA_HEIGHT);
    state.puckPos = puck.position;
    state.player1Pos = player1.position;
    state.player2Pos = player2.position;
    io.emit("updateGameState", state);
}

setInterval(tick, TICKRATE_MS);

console.log("running on port 3000...");
io.listen(3000);