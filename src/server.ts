import Matter, { Bodies, Body, Composite, Engine, ICollisionCallback, Runner } from 'matter-js';
import { Server, Socket } from 'socket.io';
import { ARENA_HEIGHT, ARENA_WIDTH, MAX_PLAYER_MOVE_DISTANCE, PADDLE_RADIUS, PUCK_RADIUS, TICKRATE_MS, clamp, } from './constants';
import { startPreciseInterval } from './shared';
import { ClientToServerEvents, InterServerEvents, ServerState, ServerToClientEvents, SocketData, Team, Vector2, } from './types';

const engine = Engine.create({ gravity: { y: 0 } });
const wall_thickness = 50;

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
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

const ground = Bodies.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT + wall_thickness / 2, ARENA_WIDTH, wall_thickness, {
  isStatic: true,
});
const ceiling = Bodies.rectangle(ARENA_WIDTH / 2, -wall_thickness / 2, ARENA_WIDTH, wall_thickness, { isStatic: true });

Composite.add(engine.world, [puck, ground, ceiling]);

let playerBodies: { [id: string]: Body } = {};

let state: ServerState = {
  puckPos: puck.position,
  players: {},
  redScore: 0,
  bluScore: 0,
};

io.on('connect', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
  state.players[socket.id] = {
    position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
    team: Team.SPECTATOR,
  };
  console.log(socket.id + ' connected');

  const playerBody = Bodies.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, PADDLE_RADIUS, {
    isStatic: false,
    mass: 50.0,
    collisionFilter: {
      mask: 0b0,
    },
  });
  playerBodies[socket.id] = playerBody;
  Composite.add(engine.world, playerBody);

  socket.on('joinTeam', (team: Team, pos: Vector2) => {
    if (team == Team.SPECTATOR) {
      playerBody.collisionFilter.mask = 0b0;
    } else {
      playerBody.collisionFilter.mask = 0b1;
    }
    state.players[socket.id].team = team;
    Body.setPosition(playerBody, pos);
  });

  socket.on('requestPosition', (pos: Vector2) => {
    if (state.players[socket.id].team == Team.SPECTATOR) {
      return;
    }
    pos.x = clamp(pos.x, 0, ARENA_WIDTH);
    pos.y = clamp(pos.y, 0, ARENA_HEIGHT);
    const deltaX = pos.x - playerBody.position.x;
    const deltaY = pos.y - playerBody.position.y;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

    let delta = {
      x: deltaX,
      y: deltaY,
    };

    if (distance > MAX_PLAYER_MOVE_DISTANCE) {
      const directionX = deltaX / distance;
      const directionY = deltaY / distance;
      const newX = playerBody.position.x + directionX * MAX_PLAYER_MOVE_DISTANCE;
      const newY = playerBody.position.y + directionY * MAX_PLAYER_MOVE_DISTANCE;

      delta = {
        x: newX - playerBody.position.x,
        y: newY - playerBody.position.y,
      };
    }
    // @ts-ignore (needed because type definitions for MatterJS are not correct)
    Body.setVelocity(playerBody, delta, true);
  });

  socket.on('disconnect', (_) => {
    delete state.players[socket.id];
    Composite.remove(engine.world, playerBodies[socket.id]);
    delete playerBodies[socket.id];
    console.log(socket.id + ' disconnected');
  });
});

function resetPuck() {
  Body.setPosition(puck, {
    x: ARENA_WIDTH / 2,
    y: Math.random() * ARENA_HEIGHT,
  });
  Body.setVelocity(puck, { x: 0, y: 0 });
  Body.setAngularSpeed(puck, 0);
}

function tick() {
  Engine.update(engine, TICKRATE_MS);
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
  io.volatile.emit('updateGameState', state);
}

// const collisionHandler: ICollisionCallback = (event) => {
//   for (const pair of event.pairs) {
//     console.log(`collision between ${pair.bodyA.id} and ${pair.bodyB.id}`);
//   }
// };
// Matter.Events.on(engine, 'collisionStart', collisionHandler);

startPreciseInterval(tick, TICKRATE_MS);

console.log('running on port 3000...');
io.listen(3000);
