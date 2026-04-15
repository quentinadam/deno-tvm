import { DataEncoder as BaseDataEncoder } from '@quentinadam/evm-base';
import { ABI } from './ABI.ts';

export class DataEncoder extends BaseDataEncoder {
  constructor() {
    super((type) => new ABI(type));
  }
}
