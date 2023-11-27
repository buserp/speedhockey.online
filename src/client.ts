import { Socket, io } from "socket.io-client";
import P5 from "p5";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PUCK_RADIUS, PLAYER1X, PLAYER2X, PADDLE_WIDTH, PADDLE_HEIGHT } from "./constants";

const sio: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://127.0.0.1:3000/");

let _player = 0;

let _state: GameState = {
    puckPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    player1Pos: { x: PLAYER1X, y: CANVAS_HEIGHT / 2 },
    player2Pos: { x: PLAYER2X, y: CANVAS_HEIGHT / 2 },
    redScore: 0,
    bluScore: 0,
};

sio.on("updateGameState", (state: GameState) => {
    console.log(state);
    _state = state;
});

const sketch = (p5: P5) => {
    p5.setup = () => {
        // Creating and positioning the canvas
        const canvas = p5.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        canvas.parent("app");
        canvas.style('border', '2px solid black');

        // Configuring the canvas
        p5.background("white");

        let redButton = p5.createButton('Red');
        redButton.position(20, CANVAS_HEIGHT + 10);
        redButton.mousePressed(() => { _player = 0 });

        let blueButton = p5.createButton('Blue');
        blueButton.position(100, CANVAS_HEIGHT + 10);
        blueButton.mousePressed(() => { _player = 1; });

        p5.mouseMoved = () => {
            sio.emit("updatePosition", {
                x: p5.mouseX,
                y: p5.mouseY,
            },
                _player);
        }
    };

    // The sketch draw method
    p5.draw = () => {
        p5.background(p5.color("white"));
        // DEMO: Let the circle instances draw themselves
        p5.noStroke();
        p5.fill("orange");
        p5.ellipse(_state.puckPos.x, _state.puckPos.y, PUCK_RADIUS);

        p5.fill("red");
        p5.rect(_state.player1Pos.x, _state.player1Pos.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        p5.fill("blue");
        p5.rect(_state.player2Pos.x, _state.player2Pos.y, PADDLE_WIDTH, PADDLE_HEIGHT);

        p5.textSize(32);
        p5.textAlign(p5.CENTER, p5.TOP);
        p5.fill(255, 0, 0); // Red color
        p5.text('Red Score: ' + _state.redScore, CANVAS_WIDTH / 4, 10);

        p5.fill(0, 0, 255); // Blue color
        p5.text('Blu Score: ' + _state.bluScore, (3 * CANVAS_WIDTH) / 4, 10);
    };
};

new P5(sketch);