import { Instruction } from './Instruction.ts';
import type { TriggerSmartContractInstructionPayload } from './TriggerSmartContractInstructionPayload.ts';

export class TriggerSmartContractInstruction extends Instruction<TriggerSmartContractInstructionPayload> {
  constructor(payload: TriggerSmartContractInstructionPayload) {
    super({ code: 31, type: 'TriggerSmartContract', payload });
  }
}
