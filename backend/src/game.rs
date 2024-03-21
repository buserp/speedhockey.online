use rapier2d::na::clamp;
use rapier2d::prelude::*;
use std::collections::HashMap;
use tokio::sync::{mpsc, watch};
use tokio::time;
use tokio::time::Duration;
use tracing::info;

use crate::speedhockey_interface::{Player, Team, Vector2};

pub type ObjectId = u64;

/// 60 Hz
const FRAME_RATE: Duration = Duration::from_micros(16670);
pub const PUCK_ID: ObjectId = 0;

// 16:9 aspect ratio, for smartphones
// Must match consts in index.ts
const ARENA_WIDTH: f32 = 16.0;
const ARENA_HEIGHT: f32 = 9.0;

const WALL_THICKNESS: f32 = 1.0;

const PUCK_RADIUS: f32 = 0.5;
const PADDLE_RADIUS: f32 = 0.5;

pub enum EngineInputMessage {
    AddPlayer(ObjectId),
    SetTeam(ObjectId, Team),
    MovePlayer(ObjectId, Vector2),
    RemovePlayer(ObjectId),
}

pub struct GameState {
    pub players: HashMap<ObjectId, Player>,
    pub puck_pos: Vector2,
    pub red_score: u32,
    pub blue_score: u32,
}

impl GameState {
    pub fn new() -> Self {
        GameState {
            players: HashMap::<ObjectId, Player>::new(),
            puck_pos: Vector2 {
                x: ARENA_WIDTH / 2.0,
                y: ARENA_HEIGHT / 2.0,
            },
            red_score: 0,
            blue_score: 0,
        }
    }
}

struct PhysicsEngine {
    gravity: rapier2d::na::Vector2<f32>,
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
}

impl PhysicsEngine {
    fn new(gravity: rapier2d::na::Vector2<f32>) -> Self {
        let rigid_body_set = RigidBodySet::new();
        let collider_set = ColliderSet::new();
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
        PhysicsEngine {
            gravity,
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
        }
    }

    fn step(self: &mut Self) {
        self.physics_pipeline.step(
            &self.gravity,
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
    }

    fn rapier_to_proto(vec: &rapier2d::na::Vector2<f32>) -> Vector2 {
        Vector2 { x: vec.x, y: vec.y }
    }
}

pub struct Game {
    engine: PhysicsEngine,
    puck_handle: RigidBodyHandle,
    objects: HashMap<ObjectId, RigidBodyHandle>,
    teams: HashMap<ObjectId, Team>,
    red_score: u32,
    blue_score: u32,
}

impl Game {
    pub fn new() -> Self {
        let gravity = vector![0.0, 0.0];
        let mut engine = PhysicsEngine::new(gravity);
        let mut objects: HashMap<ObjectId, RigidBodyHandle> = HashMap::new();
        let teams = HashMap::<ObjectId, Team>::new();

        let floor = ColliderBuilder::cuboid(ARENA_WIDTH / 2.0, WALL_THICKNESS)
            .translation(vector![ARENA_WIDTH / 2.0, -WALL_THICKNESS])
            .build();
        let ceiling = ColliderBuilder::cuboid(ARENA_WIDTH / 2.0, WALL_THICKNESS)
            .translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT + WALL_THICKNESS])
            .build();
        engine.collider_set.insert(floor);
        engine.collider_set.insert(ceiling);

        let puck_rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT / 2.0])
            .lock_rotations()
            .build();
        let puck_collider = ColliderBuilder::ball(PUCK_RADIUS)
            .restitution(1.0)
            .friction(0.0)
            .build();
        let puck_body_handle = engine.rigid_body_set.insert(puck_rigid_body);
        engine.collider_set.insert_with_parent(
            puck_collider,
            puck_body_handle,
            &mut engine.rigid_body_set,
        );
        objects.insert(PUCK_ID, puck_body_handle);

        return Game {
            engine,
            puck_handle: puck_body_handle,
            objects,
            teams,
            red_score: 0,
            blue_score: 0,
        };
    }

    fn add_player(self: &mut Self, id: ObjectId) -> Option<()> {
        if id == PUCK_ID {
            return None;
        }
        let rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT / 2.0])
            .lock_rotations()
            .build();
        let collider = ColliderBuilder::ball(PADDLE_RADIUS)
            .restitution(1.0)
            .friction(0.0)
            .build();
        let player_body_handle = self.engine.rigid_body_set.insert(rigid_body);
        self.engine.collider_set.insert_with_parent(
            collider,
            player_body_handle,
            &mut self.engine.rigid_body_set,
        );
        self.objects.insert(id, player_body_handle);
        self.teams.insert(id, Team::Spectator);
        Some(())
    }

    fn move_player(self: &mut Self, id: ObjectId, position: Vector2) -> Option<()> {
        let player_handle = self.objects.get(&id)?;
        let desired = vector![
            clamp(position.x, 0.0, ARENA_WIDTH),
            clamp(position.y, 0.0, ARENA_HEIGHT)
        ];
        let player_body = self.engine.rigid_body_set.get_mut(*player_handle)?;
        let delta = desired - player_body.translation();
        player_body.set_linvel(delta, true);
        Some(())
    }

    fn remove_player(self: &mut Self, id: ObjectId) -> Option<()> {
        if id == PUCK_ID {
            return None;
        }
        let handle = self.objects.get(&id)?;
        self.engine.rigid_body_set.remove(
            *handle,
            &mut self.engine.island_manager,
            &mut self.engine.collider_set,
            &mut self.engine.impulse_joint_set,
            &mut self.engine.multibody_joint_set,
            true,
        );
        self.objects.remove(&id)?;
        self.teams.remove(&id)?;
        Some(())
    }

    fn set_team(self: &mut Self, id: ObjectId, team: Team) -> Option<()> {
        let player_handle = self.objects.get(&id)?;
        let player_body = self.engine.rigid_body_set.get_mut(*player_handle)?;
        if team.eq(&Team::Spectator) {
            player_body.set_enabled(false);
        } else {
            player_body.set_enabled(true);
        }
        self.teams.insert(id, team);
        Some(())
    }

    pub async fn run(
        self: &mut Self,
        game_state_tx: watch::Sender<GameState>,
        mut engine_input_rx: mpsc::Receiver<EngineInputMessage>,
    ) -> Result<(), watch::error::SendError<GameState>> {
        let mut interval = time::interval(FRAME_RATE);
        info!("running game loop...");
        loop {
            self.engine.step();
            let mut puck_pos = Vector2 { x: 0.0, y: 0.0 };
            {
                let puck = self
                    .engine
                    .rigid_body_set
                    .get_mut(self.puck_handle)
                    .expect("puck must exist");
                if puck.translation().x < 0.0 - PUCK_RADIUS {
                    self.red_score += 1;
                    puck.set_translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT / 2.0], true);
                    puck.set_linvel(vector![0.0, 0.0], true);
                }
                if puck.translation().x > ARENA_WIDTH + PUCK_RADIUS {
                    self.blue_score += 1;
                    puck.set_translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT / 2.0], true);
                    puck.set_linvel(vector![0.0, 0.0], true);
                }
                puck_pos = PhysicsEngine::rapier_to_proto(puck.translation());
            }
            let players: HashMap<ObjectId, Player> = self
                .objects
                .iter()
                .filter_map(|(&id, &handle)| {
                    let position = self.engine.rigid_body_set.get(handle)?.translation();
                    let team = *self.teams.get(&id)?;
                    if team.eq(&Team::Spectator) {
                        return None;
                    }
                    let player = Player {
                        position: Some(Vector2 {
                            x: position.x,
                            y: position.y,
                        }),
                        team: team as i32,
                    };
                    Some((id, player))
                })
                .collect();

            game_state_tx.send(GameState {
                players,
                puck_pos,
                red_score: self.red_score,
                blue_score: self.blue_score,
            })?;

            tokio::select! {
                Some(update) = engine_input_rx.recv() => {
                        match update {
                            EngineInputMessage::AddPlayer(id) => {self.add_player(id); },
                            EngineInputMessage::SetTeam(id, team) => { self.set_team(id, team); },
                            EngineInputMessage::MovePlayer(id, position) => { self.move_player(id, position); },
                            EngineInputMessage::RemovePlayer(id) => {self.remove_player(id); },
                            }
                    },
                _ = interval.tick() => {},
            }
        }
    }
}
