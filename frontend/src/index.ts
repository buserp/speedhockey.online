// @ts-ignore: This is provided by a Parcel loader
import certData from "bundle-text:../../cert_digest.txt"
import * as speedhockey_interface from "./speedhockey_interface.ts";

import P5 from "p5";

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

let currentTransport: WebTransport | null = null;
let currentTransportDatagramWriter: WritableStreamDefaultWriter | null = null;

let gameState: speedhockey_interface.ServerClientMessage = {
    puckPos: undefined,
    clientPos: undefined,
    otherPlayers: [],
    redScore: 0,
    blueScore: 0,
};

const container = document.getElementById('root')!;
addToEventLog("cert data: " + certData);


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
    currentTransport = transport;
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
        addToEventLog('Datagram reader ready.');
    } catch (e) {
        addToEventLog('Receiving datagrams not supported: ' + e, 'error');
        return;
    }
    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            addToEventLog('Done reading datagrams!');
            return;
        }
        try {
            let objects = speedhockey_interface.ServerClientMessage.decode(value);
            gameState = objects;
        } catch (e) {
            console.error('Error while reading datagrams: ' + e, 'error');
        }
    }
}

function addToEventLog(text: string, _severity = 'info') {
    let el = document.createElement('p');
    el.innerText = text;
    container.appendChild(el);
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
        redButton.mousePressed(() => { });

        let blueButton = p5.createButton('Blue');
        blueButton.position(100, canvasHeight + 10);
        blueButton.mousePressed(() => { });

        let specButton = p5.createButton('Spectate');
        specButton.position(180, canvasHeight + 10);
        specButton.mousePressed(() => { });
    };

    // The sketch draw method
    p5.draw = () => {
        update(p5);
        p5.background(p5.color("white"));

        p5.line(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);


        p5.fill("black");
        if (gameState.puckPos != undefined)
            p5.ellipse(gameState.puckPos.x, gameState.puckPos.y, puckRadius, puckRadius);


        p5.fill("red");
        for (const player of gameState.otherPlayers) {
            if (player.position != undefined)
                p5.ellipse(player.position.x, player.position.y, puckRadius, puckRadius);
        }
        p5.textSize(32);
        p5.textAlign(p5.CENTER, p5.TOP);
        p5.fill(p5.color("red"));
        if (gameState.redScore != undefined)
            p5.text(gameState.redScore, canvasWidth / 4, 10);

        p5.fill(p5.color("blue"));
        if (gameState.blueScore != undefined)
            p5.text(gameState.blueScore, (3 / 4 * canvasWidth), 10);
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
        })
        let data = speedhockey_interface.ClientServerMessage.encode(message).finish();
        await currentTransportDatagramWriter.write(data);
    }
}


new P5(sketch);