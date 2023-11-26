import { Server } from "socket.io";

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>({
    cors: {
        origin: "http://localhost:1234",
        methods: ["GET", "POST"]
    }
});

io.on("connect", (socket) => {
    socket.on("hello", () => {
        console.log("received hello from " + socket.id);
    });
});

// Emit time at roughly 60Hz
setInterval(() => {
    io.emit("monotonicTime", process.hrtime.bigint().toString());
}, 16);

console.log("running on port 3000...");
io.listen(3000);