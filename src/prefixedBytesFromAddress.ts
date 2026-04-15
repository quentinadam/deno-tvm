import { assert } from '@quentinadam/assert';
import * as base58check from '@quentinadam/base58check';

export function prefixedBytesFromAddress(address: string): Uint8Array<ArrayBuffer> {
  const bytes = base58check.decode(address);
  assert(bytes.length === 21);
  assert(bytes[0] === 0x41);
  return bytes;
}
