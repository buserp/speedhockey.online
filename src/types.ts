interface ServerToClientEvents {
    monotonicTime: (time: BigIntStr) => void;
}

interface ClientToServerEvents {
    hello: () => void;
}

interface InterServerEvents { }

interface SocketData { }

// Because vanilla socket.io can't serialize a bigint
type BigIntStr = string;