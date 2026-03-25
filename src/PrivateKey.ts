import { PrivateKey as Secp256k1PrivateKey, type Signature } from '@quentinadam/secp256k1';
import addressFromBytes from './addressFromBytes.ts';
import keccak256 from '@quentinadam/hash/keccak256';

export default class PrivateKey {
  readonly #privateKey: Secp256k1PrivateKey;

  constructor(privateKey: Secp256k1PrivateKey) {
    this.#privateKey = privateKey;
  }

  sign(hash: Uint8Array<ArrayBuffer>): Signature {
    return this.#privateKey.sign(hash);
  }

  static fromBytes(bytes: Uint8Array<ArrayBuffer>): PrivateKey {
    return new PrivateKey(Secp256k1PrivateKey.fromBytes(bytes));
  }

  static random(): PrivateKey {
    return new PrivateKey(Secp256k1PrivateKey.random());
  }

  toBytes(): Uint8Array<ArrayBuffer> {
    return this.#privateKey.toBytes();
  }

  toAddress(): string {
    return addressFromBytes(keccak256(this.#privateKey.getPublicKey().toBytes(false).slice(1)).slice(-20));
  }
}
