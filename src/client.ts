import { Socket, io } from "socket.io-client";
import { ClientToServerEvents, GameState, ServerToClientEvents, Team } from "./types";
import { Actor, Color, Engine, Circle, Vector, DisplayMode } from 'excalibur';
import { ARENA_WIDTH, ARENA_HEIGHT, PUCK_RADIUS, PADDLE_RADIUS } from "./constants";

const sio: Socket<ServerToClientEvents, ClientToServerEvents> = io(process.env.SOCKET_URL as string);

let state: GameState = {
  puckPos: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
  players: {},
  redScore: 0,
  bluScore: 0,
};

const game = new Engine({
  width: ARENA_WIDTH,
  height: ARENA_HEIGHT,
  displayMode: DisplayMode.FitScreen,
});

let playerActors: Set<string> = new Set();

sio.on("updateGameState", (newState: GameState) => {
  state = newState;
  for (const playerName of Object.keys(newState.players)) {
    if (!playerActors.has(playerName)) {
      createPlayer(playerName);
    }
  }
});

function createPlayer(playerName: string): Actor {
  const player = new Actor({
    name: playerName
  });
  const circle = new Circle({
    radius: PADDLE_RADIUS,
  });
  player.graphics.use(circle);
  player.on("postupdate", (_ev) => {
    const maybePlayer = state.players[playerName];
    if (!maybePlayer) {
      player.kill();
      playerActors.delete(playerName);
      return;
    }
    switch(maybePlayer.team) {
      case Team.BLU:
        circle.color = Color.Blue;
        player.graphics.use(circle);
        break;
      case Team.RED:
        circle.color = Color.Red;
        player.graphics.use(circle);
        break;
      case Team.SPECTATOR:
        player.graphics.hide();
    }
    player.transform.pos = new Vector(maybePlayer.position.x, maybePlayer.position.y);
  });
  playerActors.add(playerName);
  game.add(player);
  return player;
}

function createPuck() {
  const puck = new Actor({
    name: 'puck',
    pos: new Vector(state.puckPos.x, state.puckPos.y),
  });

  const circle = new Circle({
    color: Color.Black,
    radius: PUCK_RADIUS,
  });

  puck.graphics.use(circle);

  puck.on('postupdate', (ev) => {
    puck.transform.pos = new Vector(state.puckPos.x, state.puckPos.y);
  });

  return puck;
}

function initializeGame() {
  const puck = createPuck();
  game.add(puck);
  game.start();
}

initializeGame();