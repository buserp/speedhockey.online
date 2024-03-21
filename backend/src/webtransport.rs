use crate::game::ObjectId;
use crate::speedhockey_interface::{ClientServerMessage, Player, ServerClientMessage, Team};
use anyhow::Result;
use prost::Message;
use std::io::Write;
use std::path::Path;
use std::time::Duration;
use tokio::sync::{mpsc, watch};
use tracing::info;
use wtransport::endpoint::endpoint_side::Server;
use wtransport::endpoint::IncomingSession;
use wtransport::tls::Sha256DigestFmt;
use wtransport::Certificate;
use wtransport::Endpoint;
use wtransport::ServerConfig;

use crate::game::EngineInputMessage;
use crate::game::GameState;
use crate::game::PUCK_ID;

const CERT_DIGEST_PATH: &str = "../cert_digest.txt";

pub struct WebTransportServer {
    endpoint: Endpoint<Server>,
}

impl WebTransportServer {
    pub fn new(certificate: Certificate, listening_port: u16) -> Result<Self> {
        ctrlc::set_handler(move || {
            let cert_digest_path = Path::new(CERT_DIGEST_PATH);
            info!("removing {}", cert_digest_path.to_string_lossy());
            std::fs::remove_file(cert_digest_path).expect("cert digest should be deleted");
            std::process::exit(0);
        })
        .expect("Error setting Ctrl-C handler");
        let cert_digest = certificate.hashes().pop().unwrap();
        let config = ServerConfig::builder()
            .with_bind_default(listening_port)
            .with_certificate(certificate)
            .keep_alive_interval(Some(Duration::from_secs(3)))
            .build();

        let endpoint = Endpoint::server(config)?;
        let cert_digest_path = Path::new(CERT_DIGEST_PATH);
        info!(
            "writing cert digest to {}",
            cert_digest_path.to_string_lossy()
        );
        let mut cert_digest_file =
            std::fs::File::create(cert_digest_path).expect("cert digest hould be writable");
        cert_digest_file
            .write_all(cert_digest.fmt(Sha256DigestFmt::BytesArray).as_bytes())
            .expect("cert digest whould be written to");

        Ok(Self { endpoint })
    }

    pub fn local_port(&self) -> u16 {
        self.endpoint.local_addr().unwrap().port()
    }

    pub async fn serve(
        self,
        game_state_rx: watch::Receiver<GameState>,
        engine_input_tx: mpsc::Sender<EngineInputMessage>,
    ) -> Result<()> {
        info!("Server running on port {}", self.local_port());

        for _id in 0.. {
            let incoming_session = self.endpoint.accept().await;

            tokio::spawn(Self::handle_incoming_session(
                incoming_session,
                game_state_rx.clone(),
                engine_input_tx.clone(),
            ));
        }
        Ok(())
    }

    async fn handle_incoming_session(
        incoming_session: IncomingSession,
        mut game_state_rx: watch::Receiver<GameState>,
        engine_input_tx: mpsc::Sender<EngineInputMessage>,
    ) -> Result<()> {
        let session_request = incoming_session.await?;

        let connection = session_request.accept().await?;
        let stable_id: ObjectId = connection.stable_id() as ObjectId;
        info!("{} connected", stable_id);
        engine_input_tx
            .send(EngineInputMessage::AddPlayer(stable_id))
            .await?;

        loop {
            tokio::select! {
                _ = game_state_rx.changed() => {
                    let update = game_state_rx.borrow_and_update();
                    let other_players = update.players
                        .iter()
                        .filter_map(|(&id, player)| {
                            if id == stable_id || id == PUCK_ID {
                                return None;
                            }
                                return Some(Player {
                                team: player.team,
                                position: player.position.clone(),
                            })})
                        .collect();
                    let client_pos = match update.players.get(&stable_id) {
                        Some(player) => { player.position.clone() },
                        _ => { None },
                    };
                    let message = ServerClientMessage {
                        other_players,
                        client_pos,
                        puck_pos: Some(update.puck_pos.clone()),
                        red_score: Some(update.red_score),
                        blue_score: Some(update.blue_score),
                    };
                    connection.send_datagram(message.encode_to_vec())?;
                }
                dgram = connection.receive_datagram() => {
                    let dgram = dgram?;
                    let message = ClientServerMessage::decode(dgram.payload())?;
                    if let Some(position) = message.position {
                        engine_input_tx.send(EngineInputMessage::MovePlayer(stable_id, position)).await?;
                    };
                    if let Some(team) = message.team {
                        engine_input_tx.send(EngineInputMessage::SetTeam(stable_id, Team::try_from(team)?)).await?;
                    };
                }
                reason = connection.closed() => {
                    info!("{} disconnected: {}", stable_id, reason);
                    engine_input_tx.send(EngineInputMessage::RemovePlayer(stable_id)).await?;
                    return Ok(());
                }
            }
        }
    }
}
