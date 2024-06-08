import { Socket, io } from "socket.io-client";
import {
  ClientState,
  ClientToServerEvents,
  ServerState,
  ServerToClientEvents,
  Team,
  Vector2,
} from "./types";
import {
  Actor,
  Color,
  Engine,
  Circle,
  Vector,
  DisplayMode,
  Handler,
  ScreenElement,
  Text,
  Font,
} from "excalibur";
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PUCK_RADIUS,
  PADDLE_RADIUS,
} from "./constants";

const sio: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  process.env.SOCKET_URL as string
);

let serverState: ServerState = {
  puckPos: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
  players: {},
  redScore: 0,
  bluScore: 0,
};

let clientState: ClientState = {
  players: {},
  game: new Engine({
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    displayMode: DisplayMode.FitScreen,
  }),
};

class JoinButton extends ScreenElement {
  constructor(text: string, font: Font, onClick: () => void) {
    super();
    this.graphics.use(
      new Text({
        text: text,
        font: font,
      })
    );
    this.on("pointerdown", onClick);
  }
}

class Player extends Actor {
  circle: Circle;
  constructor(playerName: string) {
    super({ name: playerName });
    this.circle = new Circle({
      radius: PADDLE_RADIUS,
    });
    clientState.game.add(this);
  }

  onPostUpdate(_engine: Engine<any>, _delta: number): void {
    const maybePlayer = serverState.players[this.name];
    if (!maybePlayer) {
      this.kill();
      delete clientState.players[this.name];
      return;
    }
    switch (maybePlayer.team) {
      case Team.BLU:
        this.circle.color = Color.Blue;
        this.graphics.use(this.circle);
        break;
      case Team.RED:
        this.circle.color = Color.Red;
        this.graphics.use(this.circle);
        break;
      case Team.SPECTATOR:
        this.graphics.hide();
    }
    this.transform.pos = new Vector(
      maybePlayer.position.x,
      maybePlayer.position.y
    );
  }
}

class Puck extends Actor {
  constructor() {
    super({ name: "puck" });
    this.graphics.use(
      new Circle({
        color: Color.Black,
        radius: PUCK_RADIUS,
      })
    );
  }
  onPostUpdate(_engine: Engine<any>, _delta: number): void {
    this.transform.pos = new Vector(
      serverState.puckPos.x,
      serverState.puckPos.y
    );
  }
}

function startGame() {
  const puck = new Puck();
  clientState.game.add(puck);
  const joinButton = new JoinButton(
    "Join Red",
    new Font({
      size: 120,
      color: Color.Red,
    }),
    () => {
      sio.emit("joinTeam", Team.RED);
    }
  );
  clientState.game.add(joinButton);
  clientState.game.on("postupdate", () => {
    const desiredLocation: Vector2 = {
      x: clientState.game.input.pointers.primary.lastWorldPos.x,
      y: clientState.game.input.pointers.primary.lastWorldPos.y,
    };
    sio.emit("updatePosition", desiredLocation);
  });
  clientState.game.start();
  sio.on("updateGameState", (newState: ServerState) => {
    serverState = newState;
    for (const playerName of Object.keys(serverState.players)) {
      if (!(playerName in clientState.players)) {
        const playerActor = new Player(playerName);
        clientState.players[playerName] = playerActor;
      }
    }
  });
}

startGame();
