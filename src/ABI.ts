import { ABI as BaseABI } from '@quentinadam/evm-base';
import { addressFromBytes } from './addressFromBytes.ts';
import { bytesFromAddress } from './bytesFromAddress.ts';

export class ABI extends BaseABI {
  constructor(type: string) {
    super(type, { bytesFromAddress, addressFromBytes });
  }
}
