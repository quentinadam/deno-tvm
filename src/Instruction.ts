import type { InstructionPayload } from './InstructionPayload.ts';
import { encode } from './protobuf.ts';
import type { InspectFn } from './inspect.ts';

export class Instruction<T extends InstructionPayload> {
  readonly code: number;
  readonly type: string;
  readonly payload: T;

  constructor({ code, type, payload }: { code: number; type: string; payload: T }) {
    this.code = code;
    this.type = type;
    this.payload = payload;
  }

  serialize(): Uint8Array<ArrayBuffer> {
    return encode([
      { key: 1, value: this.code },
      {
        key: 2,
        value: [
          { key: 1, value: `type.googleapis.com/protocol.${this.type}` },
          { key: 2, value: this.payload.serialize() },
        ],
      },
    ]);
  }

  [Symbol.for('Deno.customInspect')](inspect: InspectFn, options: unknown): string {
    return this.#customInspect(inspect, options);
  }

  [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: unknown, inspect: InspectFn): string {
    return this.#customInspect(inspect, options);
  }

  #customInspect(inspect: InspectFn, options: unknown): string {
    return inspect(
      new (class Instruction {
        readonly code: number;
        readonly type: string;
        readonly payload: InstructionPayload;

        constructor({ code, type, payload }: { code: number; type: string; payload: InstructionPayload }) {
          this.code = code;
          this.type = type;
          this.payload = payload;
        }
      })({ code: this.code, type: this.type, payload: this.payload }),
      options,
    );
  }
}
