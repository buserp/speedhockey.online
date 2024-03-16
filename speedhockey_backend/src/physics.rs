use rapier2d::prelude::*;
use tokio::sync::{mpsc, watch};
use tokio::time;
use tokio::time::Duration;
use tracing::info;

/// 60 Hz
const FRAME_RATE: Duration = Duration::from_micros(16670);

pub enum EngineMessage {
    Add,
    Remove(RigidBodyHandle),
}

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

        info!("starting physics engine...");
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
