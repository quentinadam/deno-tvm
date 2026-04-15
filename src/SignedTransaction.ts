import type { InstructionPayload } from './InstructionPayload.ts';
import { encode } from './protobuf.ts';
import type { Transaction } from './Transaction.ts';

export class SignedTransaction<T extends InstructionPayload> {
  readonly transaction: Transaction<T>;
  readonly signatures: Uint8Array<ArrayBuffer>[];

  constructor({ transaction, signatures }: { transaction: Transaction<T>; signatures: Uint8Array<ArrayBuffer>[] }) {
    this.transaction = transaction;
    this.signatures = signatures;
  }

  hash(): string {
    return this.transaction.hash();
  }

  serialize(): Uint8Array<ArrayBuffer> {
    return encode([
      { key: 1, value: this.transaction.serialize() },
      ...this.signatures.map((signature) => ({ key: 2, value: signature })),
    ]);
  }
}
