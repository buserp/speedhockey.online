use anyhow::Result;
use certificate_serde;
use http::HttpServer;
use std::path::Path;
use tokio::sync::{mpsc, watch};

use tracing::error;
use tracing::info;

use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::EnvFilter;

mod http;
mod physics;
mod webtransport;

const BUFFER_SIZE: usize = 128;

pub mod interface {
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

    let out_dir = env!("OUT_DIR");
    let cert_path = Path::new(out_dir).join(certificate_serde::LOCAL_CERT_NAME);
    let cert_data = std::fs::read_to_string(cert_path).expect("local cert path must be readable");
    let certificate = certificate_serde::deserialize_cert(cert_data);
    // let certificate = Certificate::load(
    //     "/etc/letsencrypt/live/socket.speedhockey.online/cert.pem",
    //     "/etc/letsencrypt/live/socket.speedhockey.online/privkey.pem",
    // )
    // .await
    // .expect("should load certificate");
    let cert_digest = certificate.hashes().pop().unwrap();

    let webtransport_server = webtransport::WebTransportServer::new(certificate, 27015)?;

    let v2: interface::Vector2 = interface::Vector2::default();
    info!("{:?}", v2);
    let http_server = HttpServer::new(&cert_digest, webtransport_server.local_port()).await?;

    info!(
        "Open Google Chrome and go to: http://127.0.0.1:{}",
        http_server.local_port()
    );

    let (phys_tx, phys_rx) = watch::channel(String::new());
    let (update_tx, update_rx) = mpsc::channel(BUFFER_SIZE);
    let mut physics_engine = physics::PhysicsEngine::new();

    tokio::select! {
        result = http_server.serve() => {
            error!("HTTP server: {:?}", result);
        }
        result = webtransport_server.serve(phys_rx.clone(), update_tx.clone()) => {
            error!("WebTransport server: {:?}", result);
        }
        result = physics_engine.run(phys_tx, update_rx) => {
            info!("physics engine: {:?}", result);
        }

    }

    Ok(())
}
