import { assert } from '@quentinadam/assert';
import {
  CreateSmartContractInstruction,
  CreateSmartContractInstructionPayload,
  CreateSmartContractTransaction,
} from './mod.ts';

// Built by Nile's /wallet/deploycontract for { abi: '[]', parameter, call_value: 0, consume_user_resource_percent: 100,
// origin_energy_limit: 10000000, fee_limit: 100000000, name: 'Probe' }, which answered contract_address
// 41e591c3bec28f8db55637a4c3cdf3b3b9a9e26b7c.
const transaction = new CreateSmartContractTransaction({
  instruction: new CreateSmartContractInstruction(
    new CreateSmartContractInstructionPayload({
      from: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
      data: Uint8Array.fromHex(
        '6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea164736f6c6343000706000a' +
          '00000000000000000000000024b7784dbfc673d39cea8f9ab537c29f5b7169d3',
      ),
      name: 'Probe',
      consumeUserResourcePercent: 100,
      originEnergyLimit: 10000000n,
    }),
  ),
  referenceBlockBytes: Uint8Array.fromHex('3906'),
  referenceBlockHash: Uint8Array.fromHex('a7b76d0e0c307ef1'),
  expiration: new Date(1795806066000),
  timestamp: new Date(1795806008714),
  feeLimit: 100000000n,
});

Deno.test('CreateSmartContractTransaction serializes and hashes like the network', () => {
  assert(
    transaction.serialize().toHex() ===
      '0a0239062208a7b76d0e0c307ef140d0ea87f3a1345acf01081e12ca010a30747970652e676f6f676c65617069732e636f6d2f70726f74' +
        '6f636f6c2e437265617465536d617274436f6e74726163741295010a1541d22d8dcafa5c495ba37986d9a2d6c5474d28cd21127c0a1541' +
        'd22d8dcafa5c495ba37986d9a2d6c5474d28cd211a0022536080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080' +
        '604052600080fdfea164736f6c6343000706000a00000000000000000000000024b7784dbfc673d39cea8f9ab537c29f5b7169d33064' +
        '3a0550726f62654080ade204708aab84f3a134900180c2d72f',
  );
  assert(transaction.hash() === 'abbab1fb59f86c9f6f980543139707ba4991b58754716693edb876f3853eed0b');
});

Deno.test('CreateSmartContractTransaction gives the address of the contract it creates, as the network does', () => {
  assert(transaction.contractAddress() === 'TWu4MthYNX6pmKms1Gikhx1u1n5LbQwG2D');
});
