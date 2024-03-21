use anyhow::Result;
use tokio::sync::{mpsc, watch};
use tracing::error;
use tracing::info;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::EnvFilter;
use wtransport::Certificate;

mod game;
mod webtransport;

const BUFFER_SIZE: usize = 128;
const WTRANSPORT_PORT: u16 = 27015;

pub mod speedhockey_interface {
    include!(concat!(env!("OUT_DIR"), "/speedhockey.interface.rs"));
}

pub fn init_logging() {
    let env_filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();

    tracing_subscriber::fmt()
        .with_target(true)
        .with_level(true)
        .with_env_filter(env_filter)
        .init();
}

#[tokio::main]
async fn main() -> Result<()> {
    init_logging();

    let certificate = Certificate::self_signed(["localhost", "127.0.0.1", "::1"]);
    // let certificate = Certificate::load(
    //     "/etc/letsencrypt/live/socket.speedhockey.online/cert.pem",
    //     "/etc/letsencrypt/live/socket.speedhockey.online/privkey.pem",
    // )
    // .await
    // .expect("should load certificate");

    let webtransport_server = webtransport::WebTransportServer::new(certificate, WTRANSPORT_PORT)?;

    let (game_state_tx, game_state_rx) = watch::channel(game::GameState::new());
    let (engine_input_tx, engine_input_rx) = mpsc::channel(BUFFER_SIZE);
    let mut physics_engine = game::Game::new();

    tokio::select! {
        result = webtransport_server.serve(game_state_rx, engine_input_tx) => {
            error!("WebTransport server: {:?}", result);
        }
        result = physics_engine.run(game_state_tx, engine_input_rx) => {
            info!("physics engine: {:?}", result);
        }

    }

    Ok(())
}
