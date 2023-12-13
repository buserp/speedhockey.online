import { Socket, io } from "socket.io-client";
import P5 from "p5";
import { ARENA_WIDTH, ARENA_HEIGHT, PUCK_RADIUS, PADDLE_RADIUS, canvasToArena, arenaToCanvas } from "./constants";

const sio: Socket<ServerToClientEvents, ClientToServerEvents> = io(process.env.SOCKET_URL as string);

let _player = 2;
let canvasWidth = ARENA_WIDTH;
let canvasHeight = ARENA_HEIGHT;

let state: GameState = {
    puckPos: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
    player1Pos: { x: 0, y: ARENA_HEIGHT / 2 },
    player2Pos: { x: ARENA_WIDTH, y: ARENA_HEIGHT / 2 },
    redScore: 0,
    bluScore: 0,
};

sio.on("updateGameState", (newState: GameState) => {
    state = newState;
    state.player1Pos = arenaToCanvas(canvasWidth, canvasHeight, newState.player1Pos);
    state.player2Pos = arenaToCanvas(canvasWidth, canvasHeight, newState.player2Pos);
    state.puckPos = arenaToCanvas(canvasWidth, canvasHeight, newState.puckPos);
});

const sketch = (p5: P5) => {
    p5.setup = () => {
        // Creating and positioning the canvas
        const canvas = p5.createCanvas(canvasWidth, canvasHeight);
        canvas.parent("app");
        canvas.style('border', '2px solid black');

        screen.orientation.addEventListener("change", (ev) => {
            resizeCanvas(p5);
        });
        addEventListener("resize", (ev) => {
            resizeCanvas(p5);
        });

        // Configuring the canvas
        p5.background("white");

        let redButton = p5.createButton('Red');
        redButton.position(20, canvasHeight + 10);
        redButton.mousePressed(() => { _player = 0 });

        let blueButton = p5.createButton('Blue');
        blueButton.position(100, canvasHeight + 10);
        blueButton.mousePressed(() => { _player = 1; });

        let specButton = p5.createButton('Spectate');
        specButton.position(180, canvasHeight + 10);
        specButton.mousePressed(() => { _player = 2; });

        resizeCanvas(p5);
    };

    // The sketch draw method
    p5.draw = () => {
        update(p5);
        p5.background(p5.color("white"));

        p5.line(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);


        const puckDimensions = arenaToCanvas(canvasWidth, canvasHeight, { x: PUCK_RADIUS * 2, y: PUCK_RADIUS * 2 });
        p5.fill("black");
        p5.ellipse(state.puckPos.x, state.puckPos.y, puckDimensions.x, puckDimensions.y);


        const paddleDimensions = arenaToCanvas(canvasWidth, canvasHeight, { x: PADDLE_RADIUS * 2, y: PADDLE_RADIUS * 2 });
        p5.fill("red");
        p5.ellipse(state.player1Pos.x, state.player1Pos.y, paddleDimensions.x, paddleDimensions.y);
        p5.fill("blue");
        p5.ellipse(state.player2Pos.x, state.player2Pos.y, paddleDimensions.x, paddleDimensions.y);

        p5.textSize(32);
        p5.textAlign(p5.CENTER, p5.TOP);
        p5.fill(p5.color("red"));
        p5.text(state.redScore, canvasWidth / 4, 10);

        p5.fill(p5.color("blue"));
        p5.text(state.bluScore, (3 / 4 * canvasWidth), 10);
    };
};

function update(p5: P5) {
    let canvasPosition = {
        x: p5.mouseX,
        y: p5.mouseY,
    };
    let arenaPosition = canvasToArena(canvasWidth, canvasHeight, canvasPosition);
    sio.emit("updatePosition", arenaPosition, _player);
}

function resizeCanvas(p5: P5) {
    canvasWidth = p5.windowWidth * 0.75;
    canvasHeight = p5.windowHeight * 0.75;
    p5.resizeCanvas(canvasWidth, canvasHeight);
}

new P5(sketch);