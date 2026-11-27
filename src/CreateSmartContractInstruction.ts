import { Instruction } from './Instruction.ts';
import type { CreateSmartContractInstructionPayload } from './CreateSmartContractInstructionPayload.ts';

export class CreateSmartContractInstruction extends Instruction<CreateSmartContractInstructionPayload> {
  constructor(payload: CreateSmartContractInstructionPayload) {
    super({ code: 30, type: 'CreateSmartContract', payload });
  }
}
