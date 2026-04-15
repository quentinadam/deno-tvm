import * as base58check from '@quentinadam/base58check';
import assert from '@quentinadam/assert';
import { concat } from '@quentinadam/uint8array-extension';

export function addressFromBytes(bytes: Uint8Array<ArrayBuffer>): string {
  if (bytes.length === 21) {
    assert(bytes[0] === 0x41, 'First byte must be 0x41');
    bytes = bytes.slice(1);
  }
  assert(bytes.length === 20, 'Buffer must be 20 bytes');
  return base58check.encode(concat([new Uint8Array([0x41]), bytes]));
}
