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
  ScreenElement,
  Text,
  Font,
  vec,
  Line,
  Rectangle,
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
    width: ARENA_WIDTH * 1,
    height: ARENA_HEIGHT * 1,
    displayMode: DisplayMode.FitScreen,
    backgroundColor: Color.White,
  }),
};

class JoinButton extends ScreenElement {
  constructor(text: string, font: Font, onClick: () => void) {
    super();
    this.z = 1;
    this.graphics.use(
      new Text({
        text: text,
        font: font,
      })
    );
    this.on("pointerdown", () => {
      onClick();
      clientState.game.events.emit("teamJoined");
    });
    clientState.game.events.on("teamJoined", () => {
      this.kill();
    });
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

class ScoreText extends ScreenElement {
  text: Text;
  scoreFunc: () => string;
  constructor(font: Font, scoreFunc: () => string) {
    super();
    this.z = 1;
    this.scoreFunc = scoreFunc;
    this.text = new Text({
      text: this.scoreFunc(),
      font: font,
    });
    clientState.game.on("teamJoined", () => {
      this.graphics.use(this.text);
    });
  }

  onPostUpdate(engine: Engine<any>, delta: number): void {
    this.text.text = this.scoreFunc();
  }
}

function startGame() {
  const puck = new Puck();
  clientState.game.add(puck);
  const blueButton = new JoinButton(
    "Join Blue",
    new Font({
      size: 60,
      color: Color.Blue,
    }),
    () => {
      sio.emit("joinTeam", Team.BLU);
    }
  );
  blueButton.graphics.anchor.setTo(0.5, 0.5);
  blueButton.transform.pos.setTo(ARENA_WIDTH * (3/4), ARENA_HEIGHT / 2);
  const redButton = new JoinButton(
    "Join Red",
    new Font({
      size: 60,
      color: Color.Red,
    }),
    () => {
      sio.emit("joinTeam", Team.RED);
    }
  );
  redButton.graphics.anchor.setTo(0.5, 0.5);
  redButton.transform.pos.setTo(ARENA_WIDTH * (1/4), ARENA_HEIGHT/2)
  const redScore = new ScoreText(
    new Font({
      size: 60,
      color: Color.Red,
    }),
    () => {
      return serverState.redScore.toString();
    }
  );
  redScore.anchor.setTo(0.5, 0);
  redScore.pos.setTo(ARENA_WIDTH * (1 / 4), 0);
  const blueScore = new ScoreText(
    new Font({
      size: 60,
      color: Color.Blue,
    }),
    () => {
      return serverState.bluScore.toString();
    }
  );
  blueScore.anchor.setTo(0.5, 0);
  blueScore.pos.setTo(ARENA_WIDTH * (3 / 4), 0);
  clientState.game.add(redScore);
  clientState.game.add(blueScore);
  clientState.game.add(redButton);
  clientState.game.add(blueButton);
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
  const lineActor = new Actor();
  lineActor.graphics.anchor = Vector.Zero;
  lineActor.z = -1;
  lineActor.graphics.use(
    new Line({
      start: vec(ARENA_WIDTH / 2, 0),
      end: vec(ARENA_WIDTH / 2, ARENA_HEIGHT),
      color: Color.Black,
      thickness: 5,
    })
  );
  const rectActor = new Actor();
  rectActor.graphics.anchor = Vector.Zero;
  rectActor.graphics.use(
    new Rectangle({
      width: ARENA_WIDTH,
      color: Color.Transparent,
      strokeColor: Color.Black,
      lineWidth: 5,
      height: ARENA_HEIGHT,
    })
  );
  clientState.game.add(rectActor);
  clientState.game.add(lineActor);
}

startGame();
