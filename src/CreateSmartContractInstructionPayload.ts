import { InstructionPayload } from './InstructionPayload.ts';
import { prefixedBytesFromAddress } from './prefixedBytesFromAddress.ts';
import { encode } from './protobuf.ts';
import { createInspectableDataWrapper, createInspectableScaledBigIntWrapper } from '@quentinadam/evm-base';
import type { InspectFn } from './inspect.ts';

// TronWeb's defaults: callers pay all the energy their calls use, so the origin pays none, though the network requires
// a positive limit.
export const DEFAULT_CONSUME_USER_RESOURCE_PERCENT = 100;
export const DEFAULT_ORIGIN_ENERGY_LIMIT = 10_000_000n;

/**
 * The creation of a contract by `from`, which becomes its origin: `data` is its creation code followed by its
 * constructor arguments, `value` the sun sent to its constructor, and `name` the name the network records for it. A
 * caller of the contract pays `consumeUserResourcePercent` percent of the energy its calls use, and the origin the rest,
 * up to `originEnergyLimit` per call: by default 100 and 10,000,000, as TronWeb's. It holds no ABI, which the network
 * does not need.
 */
export class CreateSmartContractInstructionPayload extends InstructionPayload {
  readonly from: string;
  readonly data: Uint8Array<ArrayBuffer>;
  readonly value: bigint;
  readonly name: string;
  readonly consumeUserResourcePercent: number;
  readonly originEnergyLimit: bigint;

  constructor({ from, data, value, name, consumeUserResourcePercent, originEnergyLimit }: {
    from: string;
    data: Uint8Array<ArrayBuffer>;
    value?: bigint;
    name?: string;
    consumeUserResourcePercent?: number;
    originEnergyLimit?: bigint;
  }) {
    super();
    this.from = from;
    this.data = data;
    this.value = value ?? 0n;
    this.name = name ?? '';
    this.consumeUserResourcePercent = consumeUserResourcePercent ?? DEFAULT_CONSUME_USER_RESOURCE_PERCENT;
    this.originEnergyLimit = originEnergyLimit ?? DEFAULT_ORIGIN_ENERGY_LIMIT;
  }

  // As the node writes it: an empty ABI, and proto3's zero values left out.
  serialize(): Uint8Array<ArrayBuffer> {
    const from = prefixedBytesFromAddress(this.from);
    return encode([
      { key: 1, value: from },
      {
        key: 2,
        value: [
          { key: 1, value: from },
          { key: 3, value: [] },
          { key: 4, value: this.data },
          ...(this.value !== 0n ? [{ key: 5, value: this.value }] : []),
          ...(this.consumeUserResourcePercent !== 0 ? [{ key: 6, value: this.consumeUserResourcePercent }] : []),
          ...(this.name !== '' ? [{ key: 7, value: this.name }] : []),
          ...(this.originEnergyLimit !== 0n ? [{ key: 8, value: this.originEnergyLimit }] : []),
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
      new (class CreateSmartContractInstructionPayload {
        readonly from;
        readonly data;
        readonly value;
        readonly name;
        readonly consumeUserResourcePercent;
        readonly originEnergyLimit;

        constructor({ from, data, value, name, consumeUserResourcePercent, originEnergyLimit }: {
          from: string;
          data: Uint8Array<ArrayBuffer>;
          value: bigint;
          name: string;
          consumeUserResourcePercent: number;
          originEnergyLimit: bigint;
        }) {
          this.from = from;
          this.data = createInspectableDataWrapper(data);
          this.value = createInspectableScaledBigIntWrapper(value, 6);
          this.name = name;
          this.consumeUserResourcePercent = consumeUserResourcePercent;
          this.originEnergyLimit = originEnergyLimit;
        }
      })({
        from: this.from,
        data: this.data,
        value: this.value,
        name: this.name,
        consumeUserResourcePercent: this.consumeUserResourcePercent,
        originEnergyLimit: this.originEnergyLimit,
      }),
      options,
    );
  }
}
