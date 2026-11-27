import { Client as BaseClient, ClientHelper } from '@quentinadam/evm-base';
import * as z from '@quentinadam/zod';
import { assert } from '@quentinadam/assert';
import { CreateSmartContractInstruction } from './CreateSmartContractInstruction.ts';
import {
  CreateSmartContractInstructionPayload,
  DEFAULT_CONSUME_USER_RESOURCE_PERCENT,
  DEFAULT_ORIGIN_ENERGY_LIMIT,
} from './CreateSmartContractInstructionPayload.ts';
import { CreateSmartContractTransaction } from './CreateSmartContractTransaction.ts';
import { TriggerSmartContractInstructionPayload } from './TriggerSmartContractInstructionPayload.ts';
import { TriggerSmartContractInstruction } from './TriggerSmartContractInstruction.ts';
import { TriggerSmartContractTransaction } from './TriggerSmartContractTransaction.ts';
import { addressFromBytes } from './addressFromBytes.ts';
import { bytesFromAddress } from './bytesFromAddress.ts';

export class Client extends BaseClient {
  readonly #walletUrl: string;
  readonly #helper: ClientHelper;
  readonly #logger?: { log: (...args: unknown[]) => void };
  readonly #fetcher: { fetch(url: string, options?: RequestInit): Promise<Response> };
  readonly #headers?: Record<string, string>;

  constructor(
    url: string | { jsonRpc: string; wallet: string },
    { logger, fetcher = { fetch: (url, options) => fetch(url, options) }, headers }: {
      logger?: { log: (...args: unknown[]) => void };
      fetcher?: { fetch(url: string, options?: RequestInit): Promise<Response> };
      headers?: Record<string, string>;
    } = {},
  ) {
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
    super(jsonRpcUrl, { helper, logger, fetcher, headers });
    this.#walletUrl = walletUrl;
    this.#helper = helper;
    this.#logger = logger;
    this.#fetcher = fetcher;
    this.#headers = headers;
  }

  async #fetch(path: string, options?: { method?: 'GET' | 'POST'; body?: string }): Promise<unknown> {
    const url = `${this.#walletUrl}${path}`;
    this.#logger?.log(options?.method ?? 'GET', url, options?.body);
    const headers = new Headers(this.#headers);
    headers.set('Content-Type', 'application/json');
    const response = await this.#fetcher.fetch(url, { method: options?.method, headers, body: options?.body });
    const text = await response.text();
    this.#logger?.log(response.status, text);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${text}`);
    }
    return JSON.parse(text);
  }

  async triggerSmartContract({ from, to, value, data, feeLimit }: {
    from: string;
    to: string;
    value?: number;
    data?: Uint8Array<ArrayBuffer> | { method: string; parameters: Uint8Array<ArrayBuffer> | unknown[] };
    feeLimit?: number;
  }): Promise<TriggerSmartContractTransaction> {
    if (data !== undefined) {
      data = this.#helper.normalizeData(data);
    }
    const json = await this.#fetch('/triggersmartcontract', {
      method: 'POST',
      body: JSON.stringify({
        owner_address: from,
        contract_address: to,
        data: data?.toHex(),
        fee_limit: feeLimit,
        call_value: value ?? 0,
        visible: true,
      }),
    });
    const expectedData = data?.toHex() ?? '';
    const expectedValue = value ?? 0;
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
            contract: z.tuple([
              z.object({
                type: z.literal('TriggerSmartContract'),
                parameter: z.object({
                  value: z.object({
                    owner_address: z.literal(from),
                    contract_address: z.literal(to),
                    // The node omits empty data and a zero call value.
                    data: z.string().optional().transform((hex) => hex ?? '').refine(
                      (hex) => hex === expectedData,
                      (hex) => `Expected data ${expectedData}, got ${hex}`,
                    ),
                    call_value: z.number().optional().transform((callValue) => callValue ?? 0).refine(
                      (callValue) => callValue === expectedValue,
                      (callValue) => `Expected call value ${expectedValue}, got ${callValue}`,
                    ),
                  }).transform(({ owner_address, contract_address, data, call_value }) => {
                    return new TriggerSmartContractInstructionPayload({
                      from: owner_address,
                      to: contract_address,
                      data: Uint8Array.fromHex(data),
                      value: BigInt(call_value),
                    });
                  }),
                  type_url: z.literal('type.googleapis.com/protocol.TriggerSmartContract'),
                }),
              }).transform(({ parameter: { value: payload } }) => {
                return new TriggerSmartContractInstruction(payload);
              }),
            ]),
            ref_block_bytes: z.string().transform((refBlockBytes) => Uint8Array.fromHex(refBlockBytes)),
            ref_block_hash: z.string().transform((refBlockHash) => Uint8Array.fromHex(refBlockHash)),
            expiration: z.number().transform((expiration) => new Date(expiration)),
            fee_limit: z.number().transform((value) => BigInt(value)).optional(),
            timestamp: z.number().transform((timestamp) => new Date(timestamp)),
          }).transform(({
            contract: [instruction],
            ref_block_bytes: referenceBlockBytes,
            ref_block_hash: referenceBlockHash,
            expiration,
            fee_limit: feeLimit,
            timestamp,
          }) => {
            return new TriggerSmartContractTransaction({
              instruction,
              referenceBlockBytes,
              referenceBlockHash,
              expiration,
              feeLimit,
              timestamp,
            });
          }),
          raw_data_hex: z.string(),
        }),
      }).transform(({ transaction }) => {
        return { success: true, transaction } as const;
      }),
    ]).parse(json);
    if (!result.success) {
      throw new Error(result.error);
    }
    const transaction = result.transaction.raw_data;
    assert(transaction.serialize().toHex() === result.transaction.raw_data_hex);
    assert(transaction.hash() === result.transaction.txID);
    return transaction;
  }

  /**
   * The node's unsigned transaction creating a contract from `from` with `data`, its creation code followed by its
   * constructor arguments, as `CreateSmartContractInstructionPayload` describes, with its defaults, checked against what
   * was asked.
   */
  async deployContract({
    from,
    data,
    value,
    name,
    consumeUserResourcePercent = DEFAULT_CONSUME_USER_RESOURCE_PERCENT,
    originEnergyLimit = Number(DEFAULT_ORIGIN_ENERGY_LIMIT),
    feeLimit,
  }: {
    from: string;
    data: Uint8Array<ArrayBuffer>;
    value?: number;
    name?: string;
    consumeUserResourcePercent?: number;
    originEnergyLimit?: number;
    feeLimit?: number;
  }): Promise<CreateSmartContractTransaction> {
    const json = await this.#fetch('/deploycontract', {
      method: 'POST',
      body: JSON.stringify({
        owner_address: from,
        abi: '[]',
        bytecode: data.toHex(),
        call_value: value ?? 0,
        consume_user_resource_percent: consumeUserResourcePercent,
        origin_energy_limit: originEnergyLimit,
        fee_limit: feeLimit,
        name: name ?? '',
        visible: true,
      }),
    });
    // The node omits each field whose value is proto3's zero.
    const expected = <T>(field: string, expectedValue: T) => {
      return [
        (value: T) => value === expectedValue,
        (value: T) => `Expected ${field} ${expectedValue}, got ${value}`,
      ] as const;
    };
    const result = z.union([
      z.object({ Error: z.string() }).transform(({ Error: error }) => ({ success: false, error } as const)),
      z.object({
        visible: z.literal(true),
        txID: z.string(),
        contract_address: z.string(),
        raw_data: z.object({
          contract: z.tuple([
            z.object({
              type: z.literal('CreateSmartContract'),
              parameter: z.object({
                value: z.object({
                  owner_address: z.literal(from),
                  new_contract: z.object({
                    origin_address: z.literal(from),
                    abi: z.unknown().refine(
                      (abi) => JSON.stringify(abi) === '{}',
                      (abi) => `Expected an empty ABI, got ${JSON.stringify(abi)}`,
                    ),
                    bytecode: z.string().refine(...expected('bytecode', data.toHex())),
                    call_value: z.number().optional().transform((callValue) => callValue ?? 0)
                      .refine(...expected('call value', value ?? 0)),
                    consume_user_resource_percent: z.number().optional().transform((percent) => percent ?? 0)
                      .refine(...expected('consume user resource percent', consumeUserResourcePercent)),
                    name: z.string().optional().transform((contractName) => contractName ?? '')
                      .refine(...expected('name', name ?? '')),
                    origin_energy_limit: z.number().optional().transform((limit) => limit ?? 0)
                      .refine(...expected('origin energy limit', originEnergyLimit)),
                  }),
                }).transform(({ owner_address, new_contract }) => {
                  return new CreateSmartContractInstructionPayload({
                    from: owner_address,
                    data: Uint8Array.fromHex(new_contract.bytecode),
                    value: BigInt(new_contract.call_value),
                    name: new_contract.name,
                    consumeUserResourcePercent: new_contract.consume_user_resource_percent,
                    originEnergyLimit: BigInt(new_contract.origin_energy_limit),
                  });
                }),
                type_url: z.literal('type.googleapis.com/protocol.CreateSmartContract'),
              }),
            }).transform(({ parameter: { value: payload } }) => new CreateSmartContractInstruction(payload)),
          ]),
          ref_block_bytes: z.string().transform((refBlockBytes) => Uint8Array.fromHex(refBlockBytes)),
          ref_block_hash: z.string().transform((refBlockHash) => Uint8Array.fromHex(refBlockHash)),
          expiration: z.number().transform((expiration) => new Date(expiration)),
          fee_limit: z.number().transform((value) => BigInt(value)).optional(),
          timestamp: z.number().transform((timestamp) => new Date(timestamp)),
        }).transform(({
          contract: [instruction],
          ref_block_bytes: referenceBlockBytes,
          ref_block_hash: referenceBlockHash,
          expiration,
          fee_limit: feeLimit,
          timestamp,
        }) => {
          return new CreateSmartContractTransaction({
            instruction,
            referenceBlockBytes,
            referenceBlockHash,
            expiration,
            feeLimit,
            timestamp,
          });
        }),
        raw_data_hex: z.string(),
      }).transform((transaction) => ({ success: true, transaction } as const)),
    ]).parse(json);
    if (!result.success) {
      throw new Error(result.error);
    }
    const transaction = result.transaction.raw_data;
    assert(transaction.serialize().toHex() === result.transaction.raw_data_hex);
    assert(transaction.hash() === result.transaction.txID);
    assert(transaction.contractAddress() === addressFromBytes(Uint8Array.fromHex(result.transaction.contract_address)));
    return transaction;
  }

  async broadcastHex(bytes: Uint8Array | string): Promise<string> {
    if (typeof bytes === 'string') {
      bytes = this.#helper.deserializeBytes(bytes);
    }
    const json = await this.#fetch('/broadcasthex', {
      method: 'POST',
      body: JSON.stringify({ transaction: bytes.toHex() }),
    });
    const { txid } = z.object({
      result: z.literal(true),
      code: z.literal('SUCCESS'),
      txid: z.string(),
    }).parse(json);
    return txid;
  }
}
