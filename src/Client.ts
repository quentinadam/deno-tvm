import { Client as BaseClient, ClientHelper } from '@quentinadam/evm-base';
import * as z from '@quentinadam/zod';
import assert from '@quentinadam/assert';
import TriggerSmartContractInstructionPayload from './TriggerSmartContractInstructionPayload.ts';
import Instruction from './Instruction.ts';
import TriggerSmartContractTransaction from './TriggerSmartContractTransaction.ts';
import addressFromBytes from './addressFromBytes.ts';
import bytesFromAddress from './bytesFromAddress.ts';

export default class Client extends BaseClient {
  readonly #walletUrl;
  readonly #helper;

  constructor(url: string | { jsonRpc: string; wallet: string }) {
    const { jsonRpcUrl, walletUrl } = (() => {
      if (typeof url === 'string') {
        return { jsonRpcUrl: `${url}/jsonrpc`, walletUrl: `${url}/wallet` };
      } else {
        return { jsonRpcUrl: url.jsonRpc, walletUrl: url.wallet };
      }
    })();
    const helper = new ClientHelper({
      addressFromBytes,
      bytesFromAddress,
      serializeHash: (hash) => '0x' + hash,
      deserializeHash: (hash) => hash.slice(2),
    });
    super(jsonRpcUrl, helper);
    this.#walletUrl = walletUrl;
    this.#helper = helper;
  }

  async triggerSmartContract({ owner, address, data, feeLimit, value }: {
    owner: string;
    address: string;
    data?: Uint8Array<ArrayBuffer> | { method: string; parameters: Uint8Array<ArrayBuffer> | unknown[] };
    feeLimit?: number;
    value?: number;
  }): Promise<TriggerSmartContractTransaction> {
    if (data !== undefined) {
      data = this.#helper.normalizeData(data);
    }
    const response = await fetch(`${this.#walletUrl}/triggersmartcontract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_address: owner,
        contract_address: address,
        data: data?.toHex(),
        fee_limit: feeLimit,
        call_value: value !== undefined ? Number(value) : 0,
        visible: true,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    const result = z.union([
      z.object({ result: z.object({ code: z.string(), message: z.string() }) }).transform(
        ({ result: { code, message } }) => {
          return { success: false, error: `${message} (${code})` } as const;
        },
      ),
      z.object({
        result: z.object({ result: z.literal(true) }),
        transaction: z.object({
          visible: z.literal(true),
          txID: z.string(),
          raw_data: z.object({
            address: z.tuple([
              z.object({
                type: z.literal('TriggerSmartContract'),
                parameter: z.object({
                  value: z.object({
                    owner_address: z.literal(owner),
                    contract_address: z.literal(address),
                    data: z.literal(data?.toHex()),
                    call_value: z.literal(value),
                  }).transform(({ owner_address, contract_address, data, call_value }) => {
                    return new TriggerSmartContractInstructionPayload({
                      owner: owner_address,
                      address: contract_address,
                      data: data !== undefined ? Uint8Array.fromHex(data) : new Uint8Array(),
                      value: call_value !== undefined ? BigInt(call_value) : 0n,
                    });
                  }),
                  type_url: z.literal('type.googleapis.com/protocol.TriggerSmartContract'),
                }),
              }).transform(({ type, parameter: { value: payload } }) => {
                return new Instruction<TriggerSmartContractInstructionPayload>({ code: 31, type, payload });
              }),
            ]),
            ref_block_bytes: z.string(),
            ref_block_hash: z.string(),
            expiration: z.number().transform((expiration) => new Date(expiration)),
            fee_limit: z.number().optional(),
            timestamp: z.number().transform((timestamp) => new Date(timestamp)),
          }).transform(
            ({ address: [instruction], ref_block_bytes, ref_block_hash, expiration, fee_limit, timestamp }) => {
              return new TriggerSmartContractTransaction({
                instruction,
                referenceBlockBytes: Uint8Array.fromHex(ref_block_bytes),
                referenceBlockHash: Uint8Array.fromHex(ref_block_hash),
                expiration,
                feeLimit: fee_limit !== undefined ? BigInt(fee_limit) : undefined,
                timestamp,
              });
            },
          ),
          raw_data_hex: z.string(),
        }),
      }).transform(({ transaction }) => {
        return { success: true, transaction } as const;
      }),
    ]).parse(await response.json());
    if (!result.success) {
      throw new Error(result.error);
    }
    const transaction = result.transaction.raw_data;
    assert(transaction.serialize().toHex() === result.transaction.raw_data_hex);
    assert(transaction.hash() === result.transaction.txID);
    return transaction;
  }

  async broadcastHex(bytes: Uint8Array): Promise<string> {
    const response = await fetch(`${this.#walletUrl}/broadcasthex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: bytes.toHex() }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    const { txid } = z.object({
      result: z.literal(true),
      code: z.literal('SUCCESS'),
      txid: z.string(),
    }).parse(await response.json());
    return txid;
  }
}
