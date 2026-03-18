import { computeCREATEAddress as baseComputeCREATEAddress } from '@quentinadam/evm-base';
import addressFromBytes from './addressFromBytes.ts';
import bytesFromAddress from './bytesFromAddress.ts';

export default function computeCREATEAddress(
  { deployer, nonce }: { deployer: string; nonce: bigint | number },
): string {
  return baseComputeCREATEAddress({ deployer, nonce }, { addressFromBytes, bytesFromAddress });
}
