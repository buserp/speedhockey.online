use rapier2d::prelude::*;
use std::collections::HashMap;
use tokio::sync::{mpsc, watch};
use tokio::time;
use tokio::time::Duration;
use tracing::info;

use crate::speedhockey_interface::Vector2;

/// 60 Hz
const FRAME_RATE: Duration = Duration::from_micros(16670);
pub const PUCK_ID: u64 = 0;

// 16:9 aspect ratio, for smartphones
// Must match consts in index.ts
const ARENA_WIDTH: f32 = 16.0;
const ARENA_HEIGHT: f32 = 9.0;

const PUCK_RADIUS: f32 = 0.5;
const PADDLE_RADIUS: f32 = 0.5;

pub enum EngineInputMessage {
    AddPlayer(u64),
    MovePlayer(u64, Vector2),
    RemovePlayer(u64),
}

pub type EngineOutputMessage = HashMap<u64, Vector2>;

pub struct PhysicsEngine {
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
    objects: HashMap<u64, RigidBodyHandle>,
}

impl PhysicsEngine {
    pub fn new() -> Self {
        let mut rigid_body_set = RigidBodySet::new();
        let mut collider_set = ColliderSet::new();
        let mut objects: HashMap<u64, RigidBodyHandle> = HashMap::new();

        let floor = ColliderBuilder::cuboid(ARENA_WIDTH / 2.0, 0.1).build();
        let ceiling = ColliderBuilder::cuboid(ARENA_WIDTH / 2.0, 0.1)
            .translation(vector![0.0, ARENA_HEIGHT])
            .build();
        collider_set.insert(floor);
        collider_set.insert(ceiling);

        let puck_rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT / 2.0])
            .build();
        let puck_collider = ColliderBuilder::ball(PUCK_RADIUS)
            .restitution(1.0)
            .friction(0.0)
            .build();
        let puck_body_handle = rigid_body_set.insert(puck_rigid_body);
        collider_set.insert_with_parent(puck_collider, puck_body_handle, &mut rigid_body_set);
        objects.insert(PUCK_ID, puck_body_handle);

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
            objects,
        };
    }

    fn add_player(self: &mut Self, id: u64) -> Option<()> {
        let rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT / 2.0])
            .build();
        let collider = ColliderBuilder::ball(PADDLE_RADIUS)
            .restitution(1.0)
            .friction(0.0)
            .build();
        let ball_body_handle = self.rigid_body_set.insert(rigid_body);
        self.collider_set
            .insert_with_parent(collider, ball_body_handle, &mut self.rigid_body_set);
        self.objects.insert(id, ball_body_handle);
        Some(())
    }

    fn move_player(self: &mut Self, id: u64, position: Vector2) -> Option<()> {
        let player_handle = self.objects.get(&id)?;
        let player_body = self.rigid_body_set.get_mut(*player_handle)?;
        player_body.set_translation(vector![position.x, position.y], true);
        Some(())
    }

    fn remove_player(self: &mut Self, id: u64) -> Option<()> {
        let handle = self.objects.get(&id)?;
        self.rigid_body_set.remove(
            *handle,
            &mut self.island_manager,
            &mut self.collider_set,
            &mut self.impulse_joint_set,
            &mut self.multibody_joint_set,
            true,
        );
        Some(())
    }

    pub async fn run(
        self: &mut Self,
        engine_output_tx: watch::Sender<EngineOutputMessage>,
        mut engine_input_rx: mpsc::Receiver<EngineInputMessage>,
    ) -> Result<(), watch::error::SendError<EngineOutputMessage>> {
        let mut interval = time::interval(FRAME_RATE);

        let gravity = vector![0.0, 0.0];

        info!("running physics engine...");
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
            let puck = self.rigid_body_set.get_mut(self.puck_body_handle).unwrap();
            if puck.translation().x < 0.0 - PUCK_RADIUS
                || puck.translation().x > ARENA_WIDTH + PUCK_RADIUS
            {
                puck.set_translation(vector![ARENA_WIDTH / 2.0, ARENA_HEIGHT / 2.0], true);
            }
            let objects: EngineOutputMessage = self
                .objects
                .iter()
                .filter_map(|(&id, &handle)| {
                    let position = self.rigid_body_set.get(handle)?.translation();
                    let position = Vector2 {
                        x: position.x,
                        y: position.y,
                    };
                    Some((id, position))
                })
                .collect();

            engine_output_tx.send(objects)?;

            tokio::select! {
                Some(update) = engine_input_rx.recv() => {
                        match update {
                            EngineInputMessage::AddPlayer(id) => {self.add_player(id); },
                            EngineInputMessage::MovePlayer(id, position) => { self.move_player(id, position); },
                            EngineInputMessage::RemovePlayer(id) => {self.remove_player(id); },
                            }
                    },
                _ = interval.tick() => {},
            }
        }
    }
}
