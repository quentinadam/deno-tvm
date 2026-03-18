import type Instruction from './Instruction.ts';
import Transaction from './Transaction.ts';
import type TriggerSmartContractInstructionPayload from './TriggerSmartContractInstructionPayload.ts';

export default class TriggerSmartContractTransaction extends Transaction<TriggerSmartContractInstructionPayload> {
  constructor({ instruction, referenceBlockBytes, referenceBlockHash, expiration, feeLimit, timestamp }: {
    instruction: Instruction<TriggerSmartContractInstructionPayload>;
    referenceBlockBytes: Uint8Array<ArrayBuffer>;
    referenceBlockHash: Uint8Array<ArrayBuffer>;
    expiration: Date;
    feeLimit?: bigint;
    timestamp: Date;
  }) {
    super({ instruction, referenceBlockBytes, referenceBlockHash, expiration, feeLimit, timestamp });
  }
}
