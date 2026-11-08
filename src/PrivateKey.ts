import { PrivateKey as Secp256k1PrivateKey } from '@quentinadam/secp256k1';
import { PrivateKey as BasePrivateKey } from '@quentinadam/evm-base';
import { PublicKey } from './PublicKey.ts';

export class PrivateKey extends BasePrivateKey<PublicKey> {
  constructor(privateKey: Secp256k1PrivateKey) {
    super({ privateKey, createPublicKey: (publicKey) => new PublicKey(publicKey) });
  }

  static fromBytes(bytes: Uint8Array<ArrayBuffer>): PrivateKey {
    return new PrivateKey(Secp256k1PrivateKey.fromBytes(bytes));
  }

  static random(): PrivateKey {
    return new PrivateKey(Secp256k1PrivateKey.random());
  }
}
