import InstructionPayload from './InstructionPayload.ts';
import prefixedBytesFromAddress from './prefixedBytesFromAddress.ts';
import { encode } from './protobuf.ts';
import { createInspectableDataWrapper, createInspectableScaledBigIntWrapper } from '@quentinadam/evm-base';
import type { InspectFn } from './inspect.ts';

export default class TriggerSmartContractInstructionPayload extends InstructionPayload {
  readonly owner: string;
  readonly address: string;
  readonly value: bigint;
  readonly data: Uint8Array<ArrayBuffer>;

  constructor({ owner, address, value, data }: {
    owner: string;
    address: string;
    value?: bigint;
    data?: Uint8Array<ArrayBuffer>;
  }) {
    super();
    this.owner = owner;
    this.address = address;
    this.value = value ?? 0n;
    this.data = data ?? new Uint8Array();
  }

  serialize(): Uint8Array<ArrayBuffer> {
    return encode([
      { key: 1, value: prefixedBytesFromAddress(this.owner) },
      { key: 2, value: prefixedBytesFromAddress(this.address) },
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
        readonly owner;
        readonly address;
        readonly value;
        readonly data;

        constructor({ owner, address, value, data }: {
          owner: string;
          address: string;
          value: bigint;
          data: Uint8Array<ArrayBuffer>;
        }) {
          this.owner = owner;
          this.address = address;
          this.value = createInspectableScaledBigIntWrapper(value, 6);
          this.data = createInspectableDataWrapper(data);
        }
      })({ owner: this.owner, address: this.address, value: this.value, data: this.data }),
      options,
    );
  }
}
