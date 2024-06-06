import { Bodies, Composite, Engine, Body } from "matter-js";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerState, InterServerEvents, ServerToClientEvents, SocketData, Vector2, Player, Team } from "./types";
import { TICKRATE_MS, ARENA_WIDTH, ARENA_HEIGHT, PUCK_RADIUS, PADDLE_RADIUS, MAX_PLAYER_MOVE_DISTANCE, clamp } from "./constants";


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
    collisionFilter: {
        mask: 0b1,
    },
});

const ground = Bodies.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT + wall_thickness / 2, ARENA_WIDTH, wall_thickness, { isStatic: true });
const ceiling = Bodies.rectangle(ARENA_WIDTH / 2, -wall_thickness / 2, ARENA_WIDTH, wall_thickness, { isStatic: true });

Composite.add(engine.world, [puck, ground, ceiling]);

let playerBodies: { [id: string]: Body } = {};


let state: ServerState = {
    puckPos: puck.position,
    players: {},
    redScore: 0,
    bluScore: 0,
};

io.on("connect", (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {

    state.players[socket.id] = {
        position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
        team: Team.SPECTATOR,
    };

    const playerBody = Bodies.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, PADDLE_RADIUS, {
        isStatic: false, mass: 50.0, collisionFilter: {
            mask: 0b0,
        }
    });
    playerBodies[socket.id] = playerBody;
    Composite.add(engine.world, playerBody);


    socket.on("joinTeam", (team: Team) => {
        if (team == Team.SPECTATOR) {
            playerBody.collisionFilter.mask = 0b0;
        } else {
            playerBody.collisionFilter.mask = 0b1;
        }
        state.players[socket.id].team = team;
        Body.setPosition(playerBody, {
            x: ARENA_WIDTH / 2,
            y: ARENA_HEIGHT / 2,
        });
    });

    socket.on("updatePosition", (pos: Vector2) => {
        if (state.players[socket.id].team == Team.SPECTATOR) {
            return;
        }
        const deltaX = pos.x - playerBody.position.x;
        const deltaY = pos.y - playerBody.position.y;
        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

        if (distance > MAX_PLAYER_MOVE_DISTANCE) {
            const directionX = deltaX / distance;
            const directionY = deltaY / distance;
            const newX = playerBody.position.x + directionX * MAX_PLAYER_MOVE_DISTANCE;
            const newY = playerBody.position.y + directionY * MAX_PLAYER_MOVE_DISTANCE;
            // @ts-ignore (needed because type definitions for MatterJS are not correct)
            Body.setVelocity(playerBody, { x: newX - playerBody.position.x, y: newY - playerBody.position.y }, true);
        } else {
            // @ts-ignore (needed because type definitions for MatterJS are not correct)
            Body.setVelocity(playerBody, { x: deltaX, y: deltaY }, true);
        }
    });

    socket.on("disconnect", (_) => {
        delete state.players[socket.id];
        delete playerBodies[socket.id];
    });
});


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
    for (const id in playerBodies) {
        const playerBody = playerBodies[id];
        state.players[id].position = playerBody.position;
    }
    io.emit("updateGameState", state);
}

setInterval(tick, TICKRATE_MS);

console.log("running on port 3000...");
io.listen(3000);