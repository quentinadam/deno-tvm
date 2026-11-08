import { assert } from '@quentinadam/assert';
import { PrivateKey, PublicKey } from './mod.ts';

const privateKey = PrivateKey.fromBytes(new Uint8Array(32).with(31, 1));

Deno.test("PrivateKey.getPublicKey returns this package's PublicKey", () => {
  assert(privateKey.getPublicKey() instanceof PublicKey);
});

Deno.test('PublicKey.fromBytes derives the address of its private key', () => {
  for (const compressed of [true, false]) {
    const publicKey = PublicKey.fromBytes(privateKey.getPublicKey().toBytes(compressed));
    assert(publicKey.toAddress() === 'TMVQGm1qAQYVdetCeGRRkTWYYrLXuHK2HC');
    assert(publicKey.toAddress() === privateKey.toAddress());
  }
});
