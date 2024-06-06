import { Vector2 } from "./types";

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 540;

export const TICKRATE_MS = 16;

export const PADDLE_RADIUS = 35;
export const PUCK_RADIUS = 20;

export const MAX_PLAYER_MOVE_DISTANCE = 5; // in arena pixels/tick (60Hz by default)

export function clamp(val: number, low: number, high: number): number {
    return Math.max(Math.min(val, high), low);
};
