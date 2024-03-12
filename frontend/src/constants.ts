import { Vector2 } from "./types";

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 540;

export const TICKRATE_MS = 16;

export const PADDLE_RADIUS = 35;
export const PUCK_RADIUS = 20;

export const MAX_PLAYER_MOVE_DISTANCE = 20; // in pixels/tick (60Hz by default)

export function canvasToArena(canvasWidth: number, canvasHeight: number, pos: Vector2): Vector2 {
    const xScaleFactor = ARENA_WIDTH / canvasWidth;
    const yScaleFactor = ARENA_HEIGHT / canvasHeight;
    return {
        x: pos.x * xScaleFactor,
        y: pos.y * yScaleFactor,
    };
};

export function arenaToCanvas(canvasWidth: number, canvasHeight: number, pos: Vector2): Vector2 {
    const xScaleFactor = canvasWidth / ARENA_WIDTH;
    const yScaleFactor = canvasHeight / ARENA_HEIGHT;
    return {
        x: pos.x * xScaleFactor,
        y: pos.y * yScaleFactor,
    };
};

export function clamp(val: number, low: number, high: number): number {
    return Math.max(Math.min(val, high), low);
};