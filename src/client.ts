import { Socket, io } from "socket.io-client";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PUCK_RADIUS } from "./constants";

const sio: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://127.0.0.1:3000/");

let _state: GameState = {
    puckPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    redScore: 0,
    bluScore: 0,
};


sio.on("updateGameState", (state: GameState) => {
    console.log(state);
    _state = state;
});

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

canvas.setAttribute("width", CANVAS_WIDTH.toString());
canvas.setAttribute("height", CANVAS_HEIGHT.toString());


let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

function animate(dt: number) {
    // Clear the canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'black';
    //ctx.arc(_state.puckPos.x, _state.puckPos.y, PUCK_RADIUS, 0, 2 * Math.PI);
    ctx.fillRect(_state.puckPos.x, _state.puckPos.y, 20, 20);
    requestAnimationFrame(animate);
}

animate(0);