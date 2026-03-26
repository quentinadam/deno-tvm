import { PrivateKey as Secp256k1PrivateKey } from '@quentinadam/secp256k1';
import { PrivateKey as BasePrivateKey } from '@quentinadam/evm-base';
import addressFromBytes from './addressFromBytes.ts';

export default class PrivateKey extends BasePrivateKey {
  constructor(privateKey: Secp256k1PrivateKey) {
    super({ privateKey, addressFromBytes });
  }

  static fromBytes(bytes: Uint8Array<ArrayBuffer>): PrivateKey {
    return new PrivateKey(Secp256k1PrivateKey.fromBytes(bytes));
  }

  static random(): PrivateKey {
    return new PrivateKey(Secp256k1PrivateKey.random());
  }
}
