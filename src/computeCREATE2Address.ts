import { computeCREATE2Address as baseComputeCREATE2Address } from '@quentinadam/evm-base';
import addressFromBytes from './addressFromBytes.ts';
import bytesFromAddress from './bytesFromAddress.ts';

export default function computeCREATE2Address(
  params:
    & { deployer: string; salt: bigint | number | Uint8Array<ArrayBuffer> }
    & (
      | { bytecodeHash: Uint8Array<ArrayBuffer>; bytecode?: undefined; constructorArguments?: undefined }
      | { bytecodeHash?: undefined; bytecode: Uint8Array<ArrayBuffer>; constructorArguments?: Uint8Array<ArrayBuffer> }
    ),
): string {
  return baseComputeCREATE2Address(params, { prefixByte: 0x41, addressFromBytes, bytesFromAddress });
}
