import { assert } from '@quentinadam/assert';
import {
  PrivateKey,
  type Signer,
  TriggerSmartContractInstruction,
  TriggerSmartContractInstructionPayload,
  TriggerSmartContractTransaction,
} from './mod.ts';

// Mainnet USDT transfer 1d1306aee3d400961ffb86820ba8c74a984e8d96f88a436345726565a9359855.
const transaction = new TriggerSmartContractTransaction({
  instruction: new TriggerSmartContractInstruction(
    new TriggerSmartContractInstructionPayload({
      from: 'TCBuNgdgdRvQ7eUiqWBuLUTXN9YPuL9z1b',
      to: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      data: Uint8Array.fromHex(
        'a9059cbb0000000000000000000000003cfce964fdf0385ddf8eb21f1e02baa221a2d3a7' +
          '0000000000000000000000000000000000000000000000000000000007de2900',
      ),
    }),
  ),
  referenceBlockBytes: Uint8Array.fromHex('acd8'),
  referenceBlockHash: Uint8Array.fromHex('783f0818fb0395d7'),
  expiration: new Date(1794064926811),
  timestamp: new Date(1794064626811),
  feeLimit: 50000000n,
});

Deno.test('TriggerSmartContractTransaction serializes and hashes like the network', () => {
  assert(
    transaction.serialize().toHex() ===
      '0a02acd82208783f0818fb0395d740db90e9b49b345aae01081f12a9010a31747970652e676f6f676c65617069732e636f6d2f70726f746f' +
        '636f6c2e54726967676572536d617274436f6e747261637412740a15411856f1d58ac4bd0933dea2883424127677a5e579121541a614f8' +
        '03b6fd780986a42c78ec9c7f77e6ded13c2244a9059cbb0000000000000000000000003cfce964fdf0385ddf8eb21f1e02baa221a2d3a7' +
        '0000000000000000000000000000000000000000000000000000000007de290070fbe8d6b49b34900180e1eb17',
  );
  assert(transaction.hash() === '1d1306aee3d400961ffb86820ba8c74a984e8d96f88a436345726565a9359855');
});

Deno.test('Transaction.sign with an async signer matches signing with the private key', async () => {
  const privateKey = PrivateKey.fromBytes(new Uint8Array(32).fill(1));
  const signer: Signer = {
    sign: async (digest) => await Promise.resolve(privateKey.sign(digest)),
  };
  const expected = await transaction.sign(privateKey);
  const actual = await transaction.sign(signer);
  assert(actual.serialize().toHex() === expected.serialize().toHex());
  assert(actual.hash() === expected.hash());
});
