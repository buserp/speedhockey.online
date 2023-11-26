import { Socket, io } from "socket.io-client";

const sio: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://127.0.0.1:3000/");

sio.emit("hello");

sio.on("monotonicTime", (time: BigIntStr) => {
    _time = BigInt(time);
})

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

var _time: bigint = BigInt(0);

const width = canvas.width;
const height = canvas.height;

let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

setInterval(() => {
    // Clear the canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'red';
    ctx.fillRect(width / 2, height / 2 + cyclicSine(_time) * 50, 25, 25);
}, 16);


function nanosecondsToSeconds(nanoseconds: bigint): number {
    return Number(nanoseconds) / 1e9;
}

function cyclicSine(timestamp: bigint): number {
    const seconds = nanosecondsToSeconds(timestamp);
    const frequency = 0.3; // Adjust the frequency as needed
    const amplitude = 1.0; // Adjust the amplitude as needed
    return amplitude * Math.sin(2 * Math.PI * frequency * seconds);
}