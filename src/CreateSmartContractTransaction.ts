import { keccak256 } from '@quentinadam/hash/keccak256';
import { concat } from '@quentinadam/uint8array-extension';
import { addressFromBytes } from './addressFromBytes.ts';
import type { CreateSmartContractInstructionPayload } from './CreateSmartContractInstructionPayload.ts';
import type { Instruction } from './Instruction.ts';
import { prefixedBytesFromAddress } from './prefixedBytesFromAddress.ts';
import { Transaction } from './Transaction.ts';

export class CreateSmartContractTransaction extends Transaction<CreateSmartContractInstructionPayload> {
  constructor({ instruction, referenceBlockBytes, referenceBlockHash, expiration, feeLimit, timestamp }: {
    instruction: Instruction<CreateSmartContractInstructionPayload>;
    referenceBlockBytes: Uint8Array<ArrayBuffer>;
    referenceBlockHash: Uint8Array<ArrayBuffer>;
    expiration: Date;
    feeLimit?: bigint;
    timestamp: Date;
  }) {
    super({ instruction, referenceBlockBytes, referenceBlockHash, expiration, feeLimit, timestamp });
  }

  /** The address of the contract the transaction creates: the last 20 bytes of the keccak256 of its hash and creator. */
  contractAddress(): string {
    const hash = Uint8Array.fromHex(this.hash());
    const creator = prefixedBytesFromAddress(this.instruction.payload.from);
    return addressFromBytes(keccak256(concat([hash, creator])).slice(12));
  }
}
