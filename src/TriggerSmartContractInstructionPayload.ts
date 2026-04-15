import { InstructionPayload } from './InstructionPayload.ts';
import { prefixedBytesFromAddress } from './prefixedBytesFromAddress.ts';
import { encode } from './protobuf.ts';
import { createInspectableDataWrapper, createInspectableScaledBigIntWrapper } from '@quentinadam/evm-base';
import type { InspectFn } from './inspect.ts';

export class TriggerSmartContractInstructionPayload extends InstructionPayload {
  readonly from: string;
  readonly to: string;
  readonly value: bigint;
  readonly data: Uint8Array<ArrayBuffer>;

  constructor({ from, to, value, data }: {
    from: string;
    to: string;
    value?: bigint;
    data?: Uint8Array<ArrayBuffer>;
  }) {
    super();
    this.from = from;
    this.to = to;
    this.value = value ?? 0n;
    this.data = data ?? new Uint8Array();
  }

  serialize(): Uint8Array<ArrayBuffer> {
    return encode([
      { key: 1, value: prefixedBytesFromAddress(this.from) },
      { key: 2, value: prefixedBytesFromAddress(this.to) },
      ...(this.value !== 0n ? [{ key: 3, value: this.value }] : []),
      { key: 4, value: this.data },
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
      new (class TriggerSmartContractInstructionPayload {
        readonly from;
        readonly to;
        readonly value;
        readonly data;

        constructor({ from, to, value, data }: {
          from: string;
          to: string;
          value: bigint;
          data: Uint8Array<ArrayBuffer>;
        }) {
          this.from = from;
          this.to = to;
          this.value = createInspectableScaledBigIntWrapper(value, 6);
          this.data = createInspectableDataWrapper(data);
        }
      })({ from: this.from, to: this.to, value: this.value, data: this.data }),
      options,
    );
  }
}
