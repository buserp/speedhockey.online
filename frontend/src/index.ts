// @ts-ignore: This is provided by a Parcel loader
import certData from "bundle-text:../../cert_digest.txt"

const certDigest = new Uint8Array(JSON.parse(certData));
let currentTransport: WebTransport | null = null;

const container = document.getElementById('root')!;

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
}
