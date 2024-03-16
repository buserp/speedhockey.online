use anyhow::Result;
use tokio::sync::{mpsc, watch};
use tracing::info;

use std::net::Ipv4Addr;
use std::net::SocketAddr;
use std::time::Duration;
use wtransport::endpoint::endpoint_side::Server;
use wtransport::endpoint::IncomingSession;
use wtransport::Certificate;
use wtransport::Endpoint;
use wtransport::ServerConfig;

use crate::physics::EngineMessage;

pub struct WebTransportServer {
    endpoint: Endpoint<Server>,
}

impl WebTransportServer {
    pub fn new(certificate: Certificate, listening_port: u16) -> Result<Self> {
        let config = ServerConfig::builder()
            .with_bind_default(listening_port)
            .with_certificate(certificate)
            .keep_alive_interval(Some(Duration::from_secs(3)))
            .build();

        let endpoint = Endpoint::server(config)?;

        Ok(Self { endpoint })
    }

    pub fn local_port(&self) -> u16 {
        self.endpoint.local_addr().unwrap().port()
    }

    pub async fn serve(
        self,
        phys_rx: watch::Receiver<String>,
        update_tx: mpsc::Sender<EngineMessage>,
    ) -> Result<()> {
        info!("Server running on port {}", self.local_port());

        for _id in 0.. {
            let incoming_session = self.endpoint.accept().await;

            tokio::spawn(Self::handle_incoming_session(
                incoming_session,
                phys_rx.clone(),
                update_tx.clone(),
            ));
        }
        Ok(())
    }

    async fn handle_incoming_session(
        incoming_session: IncomingSession,
        mut phys_rx: watch::Receiver<String>,
        update_tx: mpsc::Sender<EngineMessage>,
    ) -> Result<()> {
        let session_request = incoming_session.await?;

        let connection = session_request.accept().await?;
        info!("{} connected", connection.stable_id());

        loop {
            tokio::select! {
                _ = phys_rx.changed() => {
                    let update = format!("{}", *phys_rx.borrow_and_update());
                    connection.send_datagram(update)?;
                }
                dgram = connection.receive_datagram() => {
                    let dgram = dgram?;
                    let str_data = std::str::from_utf8(&dgram)?;

                    info!("Received (dgram) '{str_data}' from client");
                    if str_data.starts_with("add") {
                        update_tx.send(EngineMessage::Add).await?;
                    }

                    connection.send_datagram(b"ACK")?;
                }
                reason = connection.closed() => {
                    info!("{} disconnected: {}", connection.stable_id(), reason);
                    return Ok(());
                }
            }
        }
    }
}
