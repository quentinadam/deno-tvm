import { DataEncoder as BaseDataEncoder } from '@quentinadam/evm-base';
import ABI from './ABI.ts';

export default class DataEncoder extends BaseDataEncoder {
  constructor() {
    super((type) => new ABI(type));
  }
}
