import { Server } from "socket.io";

const io = new Server({ /* options */ });

io.on("connection", (socket) => {
    console.log("someone connected!");
});

console.log("running on port 3000...");
io.listen(3000);