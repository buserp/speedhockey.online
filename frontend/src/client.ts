import { ClientToServerEvents, GameState, ServerToClientEvents, Team } from "./types";
import P5 from "p5";
import { ARENA_WIDTH, ARENA_HEIGHT, PUCK_RADIUS, PADDLE_RADIUS, canvasToArena, arenaToCanvas } from "./constants";


const HASH = new Uint8Array(JSON.parse(process.env.CERT_DIGEST));

let canvasWidth = ARENA_WIDTH;
let canvasHeight = ARENA_HEIGHT;

let currentTransport, streamNumber, currentTransportDatagramWriter;

let state: GameState = {
    puckPos: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
    players: {},
    redScore: 0,
    bluScore: 0,
};

const sketch = (p5: P5) => {
    p5.setup = () => {
        const url = "https://localhost:" + process.env.WEBTRANSPORT_PORT
        let transport = new WebTransport(url, { serverCertificateHashes: [ { algorithm: "sha-256", value: HASH.buffer } ] } );
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
        redButton.mousePressed(() => {
            joinTeam(Team.RED);
        });

        let blueButton = p5.createButton('Blue');
        blueButton.position(100, canvasHeight + 10);
        blueButton.mousePressed(() => {
            joinTeam(Team.BLU);
        });

        let specButton = p5.createButton('Spectate');
        specButton.position(180, canvasHeight + 10);
        specButton.mousePressed(() => {
            joinTeam(Team.SPECTATOR);
        });

        resizeCanvas(p5);
    };

    // The sketch draw method
    p5.draw = () => {
        update(p5);
        p5.background(p5.color("white"));

        p5.line(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);

        const puckDimensions = arenaToCanvas(canvasWidth, canvasHeight, { x: PUCK_RADIUS * 2, y: PUCK_RADIUS * 2 });
        const puckPosition = arenaToCanvas(canvasWidth, canvasHeight, state.puckPos);
        p5.fill("black");
        p5.ellipse(puckPosition.x, puckPosition.y, puckDimensions.x, puckDimensions.y);


        const paddleDimensions = arenaToCanvas(canvasWidth, canvasHeight, { x: PADDLE_RADIUS * 2, y: PADDLE_RADIUS * 2 });

        for (const id in state.players) {
            const player = state.players[id];
            if (player.team == Team.RED) {
                p5.fill("red");
            } else if (player.team == Team.BLU) {
                p5.fill("blue");
            }
            const paddlePosition = arenaToCanvas(canvasWidth, canvasHeight, player.position);
            p5.ellipse(paddlePosition.x, paddlePosition.y, paddleDimensions.x, paddleDimensions.y);
        }

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
    sio.emit("updatePosition", arenaPosition);
}

function resizeCanvas(p5: P5) {
    canvasWidth = p5.windowWidth * 0.75;
    canvasHeight = p5.windowHeight * 0.75;
    p5.resizeCanvas(canvasWidth, canvasHeight);
}

function joinTeam(team: number) {
    sio.emit("joinTeam", team);
}

new P5(sketch);