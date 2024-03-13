/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "speedhockey.interface";

export enum Team {
  SPECTATOR = 0,
  RED = 1,
  BLU = 2,
  UNRECOGNIZED = -1,
}

export function teamFromJSON(object: any): Team {
  switch (object) {
    case 0:
    case "SPECTATOR":
      return Team.SPECTATOR;
    case 1:
    case "RED":
      return Team.RED;
    case 2:
    case "BLU":
      return Team.BLU;
    case -1:
    case "UNRECOGNIZED":
    default:
      return Team.UNRECOGNIZED;
  }
}

export function teamToJSON(object: Team): string {
  switch (object) {
    case Team.SPECTATOR:
      return "SPECTATOR";
    case Team.RED:
      return "RED";
    case Team.BLU:
      return "BLU";
    case Team.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  position: Vector2 | undefined;
  team: Team;
}

export interface GameState {
  puckPos: Vector2 | undefined;
  players: { [key: string]: Player };
  redScore: number;
  bluScore: number;
}

export interface GameState_PlayersEntry {
  key: string;
  value: Player | undefined;
}

function createBaseVector2(): Vector2 {
  return { x: 0, y: 0 };
}

export const Vector2 = {
  encode(message: Vector2, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.x !== 0) {
      writer.uint32(9).double(message.x);
    }
    if (message.y !== 0) {
      writer.uint32(17).double(message.y);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Vector2 {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVector2();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 9) {
            break;
          }

          message.x = reader.double();
          continue;
        case 2:
          if (tag !== 17) {
            break;
          }

          message.y = reader.double();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Vector2 {
    return {
      x: isSet(object.x) ? globalThis.Number(object.x) : 0,
      y: isSet(object.y) ? globalThis.Number(object.y) : 0,
    };
  },

  toJSON(message: Vector2): unknown {
    const obj: any = {};
    if (message.x !== 0) {
      obj.x = message.x;
    }
    if (message.y !== 0) {
      obj.y = message.y;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Vector2>, I>>(base?: I): Vector2 {
    return Vector2.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Vector2>, I>>(object: I): Vector2 {
    const message = createBaseVector2();
    message.x = object.x ?? 0;
    message.y = object.y ?? 0;
    return message;
  },
};

function createBasePlayer(): Player {
  return { position: undefined, team: 0 };
}

export const Player = {
  encode(message: Player, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.position !== undefined) {
      Vector2.encode(message.position, writer.uint32(10).fork()).ldelim();
    }
    if (message.team !== 0) {
      writer.uint32(16).int32(message.team);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Player {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePlayer();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.position = Vector2.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.team = reader.int32() as any;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Player {
    return {
      position: isSet(object.position) ? Vector2.fromJSON(object.position) : undefined,
      team: isSet(object.team) ? teamFromJSON(object.team) : 0,
    };
  },

  toJSON(message: Player): unknown {
    const obj: any = {};
    if (message.position !== undefined) {
      obj.position = Vector2.toJSON(message.position);
    }
    if (message.team !== 0) {
      obj.team = teamToJSON(message.team);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Player>, I>>(base?: I): Player {
    return Player.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Player>, I>>(object: I): Player {
    const message = createBasePlayer();
    message.position = (object.position !== undefined && object.position !== null)
      ? Vector2.fromPartial(object.position)
      : undefined;
    message.team = object.team ?? 0;
    return message;
  },
};

function createBaseGameState(): GameState {
  return { puckPos: undefined, players: {}, redScore: 0, bluScore: 0 };
}

export const GameState = {
  encode(message: GameState, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.puckPos !== undefined) {
      Vector2.encode(message.puckPos, writer.uint32(10).fork()).ldelim();
    }
    Object.entries(message.players).forEach(([key, value]) => {
      GameState_PlayersEntry.encode({ key: key as any, value }, writer.uint32(18).fork()).ldelim();
    });
    if (message.redScore !== 0) {
      writer.uint32(24).int32(message.redScore);
    }
    if (message.bluScore !== 0) {
      writer.uint32(32).int32(message.bluScore);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GameState {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGameState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.puckPos = Vector2.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          const entry2 = GameState_PlayersEntry.decode(reader, reader.uint32());
          if (entry2.value !== undefined) {
            message.players[entry2.key] = entry2.value;
          }
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.redScore = reader.int32();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.bluScore = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GameState {
    return {
      puckPos: isSet(object.puckPos) ? Vector2.fromJSON(object.puckPos) : undefined,
      players: isObject(object.players)
        ? Object.entries(object.players).reduce<{ [key: string]: Player }>((acc, [key, value]) => {
          acc[key] = Player.fromJSON(value);
          return acc;
        }, {})
        : {},
      redScore: isSet(object.redScore) ? globalThis.Number(object.redScore) : 0,
      bluScore: isSet(object.bluScore) ? globalThis.Number(object.bluScore) : 0,
    };
  },

  toJSON(message: GameState): unknown {
    const obj: any = {};
    if (message.puckPos !== undefined) {
      obj.puckPos = Vector2.toJSON(message.puckPos);
    }
    if (message.players) {
      const entries = Object.entries(message.players);
      if (entries.length > 0) {
        obj.players = {};
        entries.forEach(([k, v]) => {
          obj.players[k] = Player.toJSON(v);
        });
      }
    }
    if (message.redScore !== 0) {
      obj.redScore = Math.round(message.redScore);
    }
    if (message.bluScore !== 0) {
      obj.bluScore = Math.round(message.bluScore);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GameState>, I>>(base?: I): GameState {
    return GameState.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GameState>, I>>(object: I): GameState {
    const message = createBaseGameState();
    message.puckPos = (object.puckPos !== undefined && object.puckPos !== null)
      ? Vector2.fromPartial(object.puckPos)
      : undefined;
    message.players = Object.entries(object.players ?? {}).reduce<{ [key: string]: Player }>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = Player.fromPartial(value);
      }
      return acc;
    }, {});
    message.redScore = object.redScore ?? 0;
    message.bluScore = object.bluScore ?? 0;
    return message;
  },
};

function createBaseGameState_PlayersEntry(): GameState_PlayersEntry {
  return { key: "", value: undefined };
}

export const GameState_PlayersEntry = {
  encode(message: GameState_PlayersEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      Player.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GameState_PlayersEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGameState_PlayersEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = Player.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GameState_PlayersEntry {
    return {
      key: isSet(object.key) ? globalThis.String(object.key) : "",
      value: isSet(object.value) ? Player.fromJSON(object.value) : undefined,
    };
  },

  toJSON(message: GameState_PlayersEntry): unknown {
    const obj: any = {};
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (message.value !== undefined) {
      obj.value = Player.toJSON(message.value);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GameState_PlayersEntry>, I>>(base?: I): GameState_PlayersEntry {
    return GameState_PlayersEntry.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GameState_PlayersEntry>, I>>(object: I): GameState_PlayersEntry {
    const message = createBaseGameState_PlayersEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? Player.fromPartial(object.value)
      : undefined;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
