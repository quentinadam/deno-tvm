import concat from '@quentinadam/uint8array-extension/concat';

class BufferWriter {
  readonly #chunks = new Array<Uint8Array<ArrayBuffer>>();

  writeVarInt(value: number | bigint) {
    value = BigInt(value);
    const bytes: number[] = [];
    while (value > 0n) {
      let byte = Number(value & 0x7fn);
      value = value >> 7n;
      if (value > 0n) {
        byte = byte | 0x80;
      }
      bytes.push(byte);
    }
    if (bytes.length === 0) {
      bytes.push(0);
    }
    return this.writeBytes(new Uint8Array(bytes));
  }

  writeBytes(bytes: Uint8Array<ArrayBuffer>) {
    this.#chunks.push(bytes);
    return this;
  }

  serialize() {
    return concat(this.#chunks);
  }
}

class ProtobufWriter {
  readonly #writer = new BufferWriter();

  writeVarInt(key: number, value: number | bigint) {
    this.#writer.writeVarInt(BigInt(key) << 3n).writeVarInt(value);
    return this;
  }

  writeBytes(key: number, value: Uint8Array<ArrayBuffer>) {
    this.#writer
      .writeVarInt((BigInt(key) << 3n) | 2n)
      .writeVarInt(BigInt(value.length))
      .writeBytes(value);
    return this;
  }

  writeBytesArray(key: number, values: Uint8Array<ArrayBuffer>[]) {
    for (const value of values) {
      this.writeBytes(key, value);
    }
    return this;
  }

  writeString(key: number, value: string) {
    return this.writeBytes(key, new TextEncoder().encode(value));
  }

  serialize() {
    return this.#writer.serialize();
  }
}

type ProtobufObject = {
  key: number;
  value: boolean | number | bigint | string | Uint8Array<ArrayBuffer> | ProtobufObject;
}[];

export function encode(object: ProtobufObject) {
  const write = new ProtobufWriter();
  for (const { key, value } of object) {
    if (typeof value === 'number' || typeof value === 'bigint') {
      write.writeVarInt(key, value);
    } else if (typeof value === 'string') {
      write.writeString(key, value);
    } else if (typeof value === 'boolean') {
      write.writeVarInt(key, value ? 1 : 0);
    } else if (value instanceof Uint8Array) {
      write.writeBytes(key, value);
    } else {
      write.writeBytes(key, encode(value));
    }
  }
  return write.serialize();
}
