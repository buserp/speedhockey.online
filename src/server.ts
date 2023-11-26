import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: "http://localhost:1234",
        methods: ["GET", "POST"]
    }
});

// Emit time at roughly 60Hz
setInterval(() => {
    io.emit("monotonic_time", process.hrtime.bigint().toString());
}, 16);

console.log("running on port 3000...");
io.listen(3000);