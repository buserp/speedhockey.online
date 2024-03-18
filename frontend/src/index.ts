import certData from "bundle-text:../../cert_digest.txt"
import * as speedhockey_interface from "./speedhockey_interface.ts";

const certDigest = new Uint8Array(JSON.parse(certData));
let currentTransport: WebTransport | null = null;
let currentTransportDatagramWriter: WritableStreamDefaultWriter | null = null;

const container = document.getElementById('root')!;
addToEventLog("cert data: " + certData);
createConnectButton(container);

function createConnectButton(container: HTMLElement) {
    const connectButton = document.createElement('button');
    connectButton.innerText = "Connect";
    connectButton.onclick = handleClick;
    container.appendChild(connectButton);
}

async function handleClick() {
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
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                addToEventLog('Done reading datagrams!');
                return;
            }
            let objects = speedhockey_interface.ObjectsUpdate.decode(value);
            console.log(objects);
        }
    } catch (e) {
        addToEventLog('Error while reading datagrams: ' + e, 'error');
    }
}

function addToEventLog(text: string, _severity = 'info') {
    let el = document.createElement('p');
    el.innerText = text;
    container.appendChild(el);
}