// @ts-ignore: This is provided by a Parcel loader
import certData from "bundle-text:../../cert_digest.txt"
import * as speedhockey_interface from "./speedhockey_interface.ts";

import P5 from "p5";
import { reduceEachLeadingCommentRange } from "typescript";

const certDigest = new Uint8Array(JSON.parse(certData));

// Must match consts in physics.rs
const arenaWidth = 16;
const arenaHeight = 9;

// Tune this later
const scaleFactor = 50;

const canvasWidth = arenaWidth * scaleFactor;
const canvasHeight = arenaHeight * scaleFactor;
const puckRadius = 1 * scaleFactor;

function canvasToArena(pos: speedhockey_interface.Vector2): speedhockey_interface.Vector2 {
    return {
        x: pos.x / scaleFactor,
        y: pos.y / scaleFactor,
    };
}

function arenaToCanvas(pos: speedhockey_interface.Vector2): speedhockey_interface.Vector2 {
    return {
        x: pos.x * scaleFactor,
        y: pos.y * scaleFactor,
    };
}

let currentTeam = speedhockey_interface.Team.SPECTATOR;

let currentTransportDatagramWriter: WritableStreamDefaultWriter | null = null;

let gameState: speedhockey_interface.ServerClientMessage = {
    puckPos: undefined,
    clientPos: undefined,
    otherPlayers: [],
    redScore: 0,
    blueScore: 0,
};

const container = document.getElementById('root')!;

async function connect() {
    const url = "https://localhost:27015";
    let transport: WebTransport | null = null;
    try {
        if (certDigest == null) {
            transport = new WebTransport(url);
        } else {
            transport = new WebTransport(url, {
                serverCertificateHashes: [
                    { algorithm: "sha-256", value: certDigest.buffer }
                ]
            });
        }
    } catch (e) {
        console.log("WebTransport initilization error: " + e);
        return;
    }

    try {
        await transport.ready;
    } catch (e) {
        console.log("WebTransport connection failed");
        return;
    }
    console.log("WebTransport ready.");
    try {
        currentTransportDatagramWriter = transport.datagrams.writable.getWriter();
        console.log('Datagram writer ready.');
    } catch (e) {
        console.log('Sending datagrams not supported: ' + e, 'error');
        return;
    }
    readDatagrams(transport);
}

// Reads datagrams from |transport| into the event log until EOF is reached.
async function readDatagrams(transport: WebTransport) {
    try {
        var reader = transport.datagrams.readable.getReader();
        console.debug('Datagram reader ready.');
    } catch (e) {
        console.error('Receiving datagrams not supported: ' + e, 'error');
        return;
    }
    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            console.debug('Done reading datagrams!');
            return;
        }
        try {
            let msg = speedhockey_interface.ServerClientMessage.decode(value);
            handleMessage(msg);
        } catch (e) {
            console.error('Error while reading datagrams: ' + e, 'error');
        }
    }
}

function handleMessage(msg: speedhockey_interface.ServerClientMessage) {
    if (msg.puckPos) {
        gameState.puckPos = arenaToCanvas(msg.puckPos);
    }
    if (!msg.otherPlayers) {
        return;
    }
    if (msg.clientPos) {
        gameState.clientPos = arenaToCanvas(msg.clientPos);
    }
    if (msg.redScore) {
        gameState.redScore = msg.redScore;
    }
    if (msg.blueScore) {
        gameState.blueScore = msg.blueScore;
    }
    gameState.otherPlayers = msg.otherPlayers.flatMap((op) => {
        if (!op.position) {
            return [];
        }
        return [{
            position: arenaToCanvas(op.position),
            team: op.team,
        }];
    });
}

const sketch = (p5: P5) => {
    p5.setup = () => {
        connect();
        // Creating and positioning the canvas
        const canvas = p5.createCanvas(canvasWidth, canvasHeight);
        canvas.parent("root");
        canvas.style('border', '2px solid black');

        // Configuring the canvas
        p5.background("white");

        let redButton = p5.createButton('Red');
        redButton.position(20, canvasHeight + 10);
        redButton.mousePressed(() => { currentTeam = speedhockey_interface.Team.RED });

        let blueButton = p5.createButton('Blue');
        blueButton.position(100, canvasHeight + 10);
        blueButton.mousePressed(() => { currentTeam = speedhockey_interface.Team.BLU });

        let specButton = p5.createButton('Spectate');
        specButton.position(180, canvasHeight + 10);
        specButton.mousePressed(() => { currentTeam = speedhockey_interface.Team.SPECTATOR });
    };

    // The sketch draw method
    p5.draw = () => {
        update(p5);
        p5.background(p5.color("white"));

        p5.line(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);


        p5.fill("black");
        if (gameState.puckPos) {
            p5.circle(gameState.puckPos.x, gameState.puckPos.y, puckRadius);
        }

        for (const player of gameState.otherPlayers) {
            if (!player.position || !player.team)
                continue;
            if (player.team == speedhockey_interface.Team.RED)
                p5.fill("red");
            else if (player.team == speedhockey_interface.Team.BLU)
                p5.fill("blue");
            p5.circle(player.position.x, player.position.y, puckRadius);
        }
        if (gameState.clientPos && currentTeam != speedhockey_interface.Team.SPECTATOR) {
            if (currentTeam == speedhockey_interface.Team.RED)
                p5.fill("red");
            else
                p5.fill("blue");
            p5.circle(gameState.clientPos.x, gameState.clientPos.y, puckRadius);
            p5.fill("yellow");
            p5.square(gameState.clientPos.x - puckRadius/8, gameState.clientPos.y-puckRadius/8, puckRadius/4);
        }
        p5.textSize(32);
        p5.textAlign(p5.CENTER, p5.TOP);
        p5.fill(p5.color("red"));
        if (gameState.redScore) {
            p5.text(gameState.redScore, canvasWidth / 4, 10);
        }

        p5.fill(p5.color("blue"));
        if (gameState.blueScore) {
            p5.text(gameState.blueScore, (3 / 4 * canvasWidth), 10);
        }
    };
};

async function update(p5: P5) {
    let canvasPosition = {
        x: p5.mouseX,
        y: p5.mouseY,
    };
    let arenaPosition = canvasToArena(canvasPosition);
    if (currentTransportDatagramWriter != null) {
        let message = speedhockey_interface.ClientServerMessage.fromJSON({
            position: arenaPosition,
            team: currentTeam,
        })
        let data = speedhockey_interface.ClientServerMessage.encode(message).finish();
        await currentTransportDatagramWriter.write(data);
    }
}


new P5(sketch);