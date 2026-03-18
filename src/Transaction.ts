import { concat, fromUintBE } from '@quentinadam/uint8array-extension';
import sha256 from '@quentinadam/hash/sha256';
import type Instruction from './Instruction.ts';
import type InstructionPayload from './InstructionPayload.ts';
import { encode } from './protobuf.ts';
import type PrivateKey from './PrivateKey.ts';
import SignedTransaction from './SignedTransaction.ts';
import { createInspectableScaledBigIntWrapper } from '@quentinadam/evm-base';
import type { InspectFn } from './inspect.ts';

export default class Transaction<T extends InstructionPayload> {
  readonly instruction: Instruction<T>;
  readonly referenceBlockBytes: Uint8Array<ArrayBuffer>;
  readonly referenceBlockHash: Uint8Array<ArrayBuffer>;
  readonly expiration: Date;
  readonly feeLimit?: bigint;
  readonly timestamp: Date;

  constructor({ instruction, referenceBlockBytes, referenceBlockHash, expiration, feeLimit, timestamp }: {
    instruction: Instruction<T>;
    referenceBlockBytes: Uint8Array<ArrayBuffer>;
    referenceBlockHash: Uint8Array<ArrayBuffer>;
    expiration: Date;
    feeLimit?: bigint;
    timestamp: Date;
  }) {
    this.instruction = instruction;
    this.referenceBlockBytes = referenceBlockBytes;
    this.referenceBlockHash = referenceBlockHash;
    this.expiration = expiration;
    this.feeLimit = feeLimit;
    this.timestamp = timestamp;
  }

  #hash(): Uint8Array<ArrayBuffer> {
    return sha256(this.serialize());
  }

  hash(): string {
    return this.#hash().toHex();
  }

  serialize(): Uint8Array<ArrayBuffer> {
    return encode([
      { key: 1, value: this.referenceBlockBytes },
      { key: 4, value: this.referenceBlockHash },
      { key: 8, value: this.expiration.valueOf() },
      { key: 11, value: this.instruction.serialize() },
      { key: 14, value: this.timestamp.valueOf() },
      ...(this.feeLimit !== undefined ? [{ key: 18, value: this.feeLimit }] : []),
    ]);
  }

  sign(privateKey: PrivateKey): SignedTransaction<T> {
    const { r, s, recovery } = privateKey.sign(this.#hash());
    return new SignedTransaction({
      transaction: this,
      signatures: [concat([fromUintBE(r, 32), fromUintBE(s, 32), new Uint8Array([recovery])])],
    });
  }

  [Symbol.for('Deno.customInspect')](inspect: InspectFn, options: unknown): string {
    return this.#customInspect(inspect, options);
  }

  [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: unknown, inspect: InspectFn): string {
    return this.#customInspect(inspect, options);
  }

  #customInspect(inspect: InspectFn, options: unknown): string {
    return inspect(
      new (class Transaction {
        readonly instruction;
        readonly referenceBlockBytes;
        readonly referenceBlockHash;
        readonly expiration;
        readonly feeLimit;
        readonly timestamp;

        constructor({ instruction, referenceBlockBytes, referenceBlockHash, expiration, feeLimit, timestamp }: {
          instruction: Instruction<InstructionPayload>;
          referenceBlockBytes: Uint8Array<ArrayBuffer>;
          referenceBlockHash: Uint8Array<ArrayBuffer>;
          expiration: Date;
          feeLimit?: bigint;
          timestamp: Date;
        }) {
          this.instruction = instruction;
          this.referenceBlockBytes = `0x${referenceBlockBytes.toHex()}`;
          this.referenceBlockHash = `0x${referenceBlockHash.toHex()}`;
          this.expiration = expiration;
          this.feeLimit = feeLimit !== undefined ? createInspectableScaledBigIntWrapper(feeLimit, 6) : undefined;
          this.timestamp = timestamp;
        }
      })({
        instruction: this.instruction,
        referenceBlockBytes: this.referenceBlockBytes,
        referenceBlockHash: this.referenceBlockHash,
        expiration: this.expiration,
        feeLimit: this.feeLimit,
        timestamp: this.timestamp,
      }),
      options,
    );
  }
}
