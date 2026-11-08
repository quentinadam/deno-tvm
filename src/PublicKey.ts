import { PublicKey as Secp256k1PublicKey } from '@quentinadam/secp256k1';
import { PublicKey as BasePublicKey } from '@quentinadam/evm-base';
import { addressFromBytes } from './addressFromBytes.ts';

export class PublicKey extends BasePublicKey {
  constructor(publicKey: Secp256k1PublicKey) {
    super({ publicKey, addressFromBytes });
  }

  static fromBytes(bytes: Uint8Array<ArrayBuffer>): PublicKey {
    return new PublicKey(Secp256k1PublicKey.fromBytes(bytes));
  }
}
