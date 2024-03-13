use std::io::Read;
use std::io::Write;
use std::path::Path;

use anyhow::Context;
use anyhow::Result;
use http::HttpServer;
use rapier2d::prelude::*;
use tokio::sync::{mpsc, watch};
use tokio::time;
use tokio::time::{sleep, Duration};
use tracing::error;
use tracing::info;
use tracing::info_span;
use tracing::Instrument;
use webtransport::WebTransportServer;
use wtransport::tls::Sha256Digest;
use wtransport::tls::Sha256DigestFmt;
use wtransport::Certificate;

use certificate_serde;

const BUFFER_SIZE: usize = 128;
/// 60 Hz
const FRAME_RATE: Duration = Duration::from_micros(16670);


enum EngineMessage {
    Add,
    Remove(RigidBodyHandle),
}

struct PhysicsEngine {
    rigid_body_set: RigidBodySet,
    collider_set: ColliderSet,
    integration_parameters: IntegrationParameters,
    physics_pipeline: PhysicsPipeline,
    island_manager: IslandManager,
    broad_phase: BroadPhase,
    narrow_phase: NarrowPhase,
    impulse_joint_set: ImpulseJointSet,
    multibody_joint_set: MultibodyJointSet,
    ccd_solver: CCDSolver,
    query_pipeline: QueryPipeline,
    physics_hooks: (),
    event_handler: (),
    puck_body_handle: RigidBodyHandle,
}

impl PhysicsEngine {
    pub fn new() -> Self {
        let mut rigid_body_set = RigidBodySet::new();
        let mut collider_set = ColliderSet::new();

        /* Create the ground. */
        let floor = ColliderBuilder::cuboid(100.0, 0.1).build();
        let ceiling = ColliderBuilder::cuboid(100.0, 0.1)
            .translation(vector![0.0, 20.0])
            .build();
        collider_set.insert(floor);
        collider_set.insert(ceiling);

        let puck_rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![0.0, 10.0])
            .build();
        let puck_collider = ColliderBuilder::ball(0.5)
            .restitution(1.0)
            .friction(0.0)
            .build();
        let puck_body_handle = rigid_body_set.insert(puck_rigid_body);
        collider_set.insert_with_parent(puck_collider, puck_body_handle, &mut rigid_body_set);

        /* Create other structures necessary for the simulation. */
        let integration_parameters = IntegrationParameters::default();
        let physics_pipeline = PhysicsPipeline::new();
        let island_manager = IslandManager::new();
        let broad_phase = BroadPhase::new();
        let narrow_phase = NarrowPhase::new();
        let impulse_joint_set = ImpulseJointSet::new();
        let multibody_joint_set = MultibodyJointSet::new();
        let ccd_solver = CCDSolver::new();
        let query_pipeline = QueryPipeline::new();
        let physics_hooks = ();
        let event_handler = ();

        return PhysicsEngine {
            rigid_body_set,
            collider_set,
            integration_parameters,
            physics_pipeline,
            island_manager,
            broad_phase,
            narrow_phase,
            impulse_joint_set,
            multibody_joint_set,
            ccd_solver,
            query_pipeline,
            physics_hooks,
            event_handler,
            puck_body_handle,
        };
    }

    pub async fn run(
        self: &mut Self,
        sender: watch::Sender<String>,
        mut update_recv: mpsc::Receiver<EngineMessage>,
    ) -> Result<(), watch::error::SendError<String>> {
        let mut interval = time::interval(FRAME_RATE);

        let mut count: u64 = 0;
        let gravity = vector![0.0, 0.0];

        /* Run the game loop, stepping the simulation once per frame. */
        loop {
            self.physics_pipeline.step(
                &gravity,
                &self.integration_parameters,
                &mut self.island_manager,
                &mut self.broad_phase,
                &mut self.narrow_phase,
                &mut self.rigid_body_set,
                &mut self.collider_set,
                &mut self.impulse_joint_set,
                &mut self.multibody_joint_set,
                &mut self.ccd_solver,
                Some(&mut self.query_pipeline),
                &self.physics_hooks,
                &self.event_handler,
            );

            {
                let objects: String = self
                    .rigid_body_set
                    .iter()
                    .map(|(handle, body)| {
                        format!(
                            "{:?}: {}, {}",
                            handle.0,
                            body.translation().x,
                            body.translation().y
                        )
                    })
                    .collect::<Vec<String>>()
                    .join("\n");

                let puck = self.rigid_body_set.get_mut(self.puck_body_handle).unwrap();
                count += 1;
                if count % 120 == 0 {
                    puck.apply_impulse(vector![0.0, -10.0], true);
                }
                match sender.send(objects) {
                    Err(err) => {
                        return Err(err);
                    }
                    Ok(_) => {}
                }
            }

            tokio::select! {
                Some(update) = update_recv.recv() => {
                        match update {
                            EngineMessage::Add => {
                                let rigid_body = RigidBodyBuilder::dynamic()
                                    .translation(vector![0.0, 10.0])
                                    .build();
                                let collider = ColliderBuilder::ball(0.5)
                                    .restitution(1.0)
                                    .friction(0.0)
                                    .build();
                                let ball_body_handle = self.rigid_body_set.insert(rigid_body);
                                self.collider_set.insert_with_parent(collider, ball_body_handle, &mut self.rigid_body_set);
                                info!("adding object");
                            }
                            EngineMessage::Remove(handle) => {
                                self.rigid_body_set.remove(
                                    handle,
                                    &mut self.island_manager,
                                    &mut self.collider_set,
                                    &mut self.impulse_joint_set,
                                    &mut self.multibody_joint_set,
                                    true,
                                );
                            }
                    }},
                _ = interval.tick() => {},
            }
        }
    }
}

pub mod interface {
    include!(concat!(env!("OUT_DIR"), "/speedhockey.interface.rs"));
}

#[tokio::main]
async fn main() -> Result<()> {
    utils::init_logging();

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

    let webtransport_server = WebTransportServer::new(certificate, 27015)?;

    let v2: interface::Vector2 = interface::Vector2::default();
    info!("{:?}", v2);
    let http_server = HttpServer::new(&cert_digest, webtransport_server.local_port()).await?;

    info!(
        "Open Google Chrome and go to: http://127.0.0.1:{}",
        http_server.local_port()
    );


    let (phys_tx, phys_rx) = watch::channel(String::new());
    let (update_tx, update_rx) = mpsc::channel(BUFFER_SIZE);
    let mut physics_engine = PhysicsEngine::new();

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

mod webtransport {
    use super::*;
    use std::net::IpAddr;
    use std::net::Ipv4Addr;
    use std::net::SocketAddr;
    use std::time::Duration;
    use wtransport::endpoint::endpoint_side::Server;
    use wtransport::endpoint::IncomingSession;
    use wtransport::Endpoint;
    use wtransport::ServerConfig;

    pub struct WebTransportServer {
        endpoint: Endpoint<Server>,
    }

    impl WebTransportServer {
        pub fn new(certificate: Certificate, listening_port: u16) -> Result<Self> {
            let config = ServerConfig::builder()
                .with_bind_address(SocketAddr::new(
                    Ipv4Addr::new(0, 0, 0, 0).into(),
                    listening_port,
                ))
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

            for id in 0.. {
                let incoming_session = self.endpoint.accept().await;

                tokio::spawn(
                    Self::handle_incoming_session(
                        incoming_session,
                        phys_rx.clone(),
                        update_tx.clone(),
                    )
                    .instrument(info_span!("Connection", id)),
                );
            }
            Ok(())
        }

        async fn handle_incoming_session(
            incoming_session: IncomingSession,
            mut phys_rx: watch::Receiver<String>,
            mut update_tx: mpsc::Sender<EngineMessage>,
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
}

mod http {
    use super::*;
    use axum::http::header::CONTENT_TYPE;
    use axum::response::Html;
    use axum::routing::get;
    use axum::serve;
    use axum::serve::Serve;
    use axum::Router;
    use std::net::Ipv4Addr;
    use std::net::SocketAddr;
    use tokio::net::TcpListener;

    pub struct HttpServer {
        serve: Serve<Router, Router>,
        local_port: u16,
    }

    impl HttpServer {
        const PORT: u16 = 8080;

        pub async fn new(cert_digest: &Sha256Digest, webtransport_port: u16) -> Result<Self> {
            let router = Self::build_router(cert_digest, webtransport_port);

            let listener =
                TcpListener::bind(SocketAddr::new(Ipv4Addr::LOCALHOST.into(), Self::PORT))
                    .await
                    .context("Cannot bind TCP listener for HTTP server")?;

            let local_port = listener
                .local_addr()
                .context("Cannot get local port")?
                .port();

            Ok(HttpServer {
                serve: serve(listener, router),
                local_port,
            })
        }

        pub fn local_port(&self) -> u16 {
            self.local_port
        }

        pub async fn serve(self) -> Result<()> {
            info!("Server running on port {}", self.local_port());

            self.serve.await.context("HTTP server error")?;

            Ok(())
        }

        fn build_router(cert_digest: &Sha256Digest, webtransport_port: u16) -> Router {
            let cert_digest = cert_digest.fmt(Sha256DigestFmt::BytesArray);

            let root = move || async move {
                Html(
                    std::fs::read_to_string("testsite/index.html")
                        .expect("index.html should be readable")
                        .replace("${WEBTRANSPORT_PORT}", &webtransport_port.to_string()),
                )
            };

            let style = move || async move {
                (
                    [(CONTENT_TYPE, "text/css")],
                    std::fs::read_to_string("testsite/style.css")
                        .expect("style.css should be readble"),
                )
            };

            let client = move || async move {
                (
                    [(CONTENT_TYPE, "application/javascript")],
                    std::fs::read_to_string("testsite/client.js")
                        .expect("client.js should be readable")
                        .replace("${CERT_DIGEST}", &cert_digest),
                )
            };

            Router::new()
                .route("/", get(root))
                .route("/style.css", get(style))
                .route("/client.js", get(client))
        }
    }
}

mod utils {
    use tracing_subscriber::filter::LevelFilter;
    use tracing_subscriber::EnvFilter;

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
}
