import prefixedBytesFromAddress from './prefixedBytesFromAddress.ts';

export default function bytesFromAddress(address: string): Uint8Array<ArrayBuffer> {
  return prefixedBytesFromAddress(address).slice(1);
}
