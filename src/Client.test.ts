import { assert } from '@quentinadam/assert';
import { Client } from './mod.ts';

Deno.test('Client sends JSON-RPC and wallet requests through the given fetcher, with the given headers', async () => {
  const requests: { url: string; headers: Headers }[] = [];
  const fetcher = {
    fetch: async (url: string, options?: RequestInit) => {
      requests.push({ url, headers: new Headers(options?.headers) });
      if (url.endsWith('/jsonrpc')) {
        return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: '0xcd8690dc' }));
      }
      return await Promise.resolve(Response.json({ result: true, code: 'SUCCESS', txid: 'abc' }));
    },
  };
  const client = new Client('https://api.example', {
    fetcher,
    headers: { 'TRON-PRO-API-KEY': 'key', 'content-type': 'text/plain' },
  });
  assert(await client.getChainId() === 0xcd8690dc);
  assert(await client.broadcastHex(new Uint8Array([1])) === 'abc');
  assert(
    requests.map(({ url }) => url).join() === 'https://api.example/jsonrpc,https://api.example/wallet/broadcasthex',
  );
  for (const { headers } of requests) {
    assert(headers.get('TRON-PRO-API-KEY') === 'key' && headers.get('Content-Type') === 'application/json');
  }
});

Deno.test('Client gets the code at a base58 address', async () => {
  const bodies: unknown[] = [];
  const fetcher = {
    fetch: async (_url: string, options?: RequestInit) => {
      bodies.push(JSON.parse(String(options?.body)));
      return await Promise.resolve(Response.json({ jsonrpc: '2.0', id: 0, result: '0x6080' }));
    },
  };
  const client = new Client('https://api.example', { fetcher });
  const code = await client.getCode({ address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' });
  assert(code.toHex() === '6080');
  const [body] = bodies;
  assert(
    JSON.stringify(body) === JSON.stringify({
      method: 'eth_getCode',
      params: ['0xa614f803b6fd780986a42c78ec9c7f77e6ded13c', 'latest'],
      id: 0,
      jsonrpc: '2.0',
    }),
  );
});

function createTriggerSmartContractClient(reply: unknown) {
  const fetcher = {
    fetch: async (_url: string, _options?: RequestInit) => await Promise.resolve(Response.json(reply)),
  };
  return new Client('https://api.example', { fetcher });
}

Deno.test('Client triggers a smart contract with a zero call value, which the node omits', async () => {
  // Nile reply to { data: '8456cb59', fee_limit: 10000000, call_value: 0 }.
  const client = createTriggerSmartContractClient({
    transaction: {
      raw_data: {
        ref_block_bytes: 'c726',
        ref_block_hash: '4362204af608363e',
        expiration: 1794337455000,
        contract: [{
          parameter: {
            value: {
              owner_address: 'TYyZWnBnacweQKQFnt3djHF37LHJjmBZwn',
              contract_address: 'TLzfJjwNwS4GdWTBbiZbMezBS2s2UWzvgw',
              data: '8456cb59',
            },
            type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
          },
          type: 'TriggerSmartContract',
        }],
        timestamp: 1794337396537,
        fee_limit: 10000000,
      },
      raw_data_hex: '0a02c72622084362204af608363e4098f7e2b69c345a6d081f12690a31747970652e676f6f676c65617069732e636f6d' +
        '2f70726f746f636f6c2e54726967676572536d617274436f6e747261637412340a1541fc5c0414aae677a12fa83f5ac1421ab0b2cd6a' +
        '7312154178efc1fdbf299033340027ffadda481436ebb36622048456cb5970b9aedfb69c34900180ade204',
      txID: '2b85870b99f0635bf896866b2329bf988781ff28c3b99d01fd16a9f877c2f706',
      visible: true,
    },
    result: { result: true },
  });
  const transaction = await client.triggerSmartContract({
    from: 'TYyZWnBnacweQKQFnt3djHF37LHJjmBZwn',
    to: 'TLzfJjwNwS4GdWTBbiZbMezBS2s2UWzvgw',
    data: Uint8Array.fromHex('8456cb59'),
    value: 0,
    feeLimit: 10000000,
  });
  assert(
    transaction.serialize().toHex() ===
      '0a02c72622084362204af608363e4098f7e2b69c345a6d081f12690a31747970652e676f6f676c65617069732e636f6d2f70726f746f' +
        '636f6c2e54726967676572536d617274436f6e747261637412340a1541fc5c0414aae677a12fa83f5ac1421ab0b2cd6a7312154178ef' +
        'c1fdbf299033340027ffadda481436ebb36622048456cb5970b9aedfb69c34900180ade204',
  );
  assert(transaction.hash() === '2b85870b99f0635bf896866b2329bf988781ff28c3b99d01fd16a9f877c2f706');
});

Deno.test('Client triggers a smart contract with a call value and no or empty data', async () => {
  // Nile reply to { fee_limit: 10000000, call_value: 1000000 }, which calls the contract's receive().
  const client = createTriggerSmartContractClient({
    transaction: {
      raw_data: {
        ref_block_bytes: 'c726',
        ref_block_hash: '4362204af608363e',
        expiration: 1794337455000,
        contract: [{
          parameter: {
            value: {
              owner_address: 'TYyZWnBnacweQKQFnt3djHF37LHJjmBZwn',
              contract_address: 'TRPFF7y1LRVQJxDEkryAxfwGwWRhbQmvve',
              call_value: 1000000,
            },
            type_url: 'type.googleapis.com/protocol.TriggerSmartContract',
          },
          type: 'TriggerSmartContract',
        }],
        timestamp: 1794337396913,
        fee_limit: 10000000,
      },
      raw_data_hex: '0a02c72622084362204af608363e4098f7e2b69c345a6b081f12670a31747970652e676f6f676c65617069732e636f6d' +
        '2f70726f746f636f6c2e54726967676572536d617274436f6e747261637412320a1541fc5c0414aae677a12fa83f5ac1421ab0b2cd6a' +
        '73121541a915bde2aae6dd4711b6166841ff0705fa7712e118c0843d70b1b1dfb69c34900180ade204',
      txID: 'f3fbb4ff63e79f5e3f9f593097e64eaf7bd3f5395b5d77016877230b6226aaba',
      visible: true,
    },
    result: { result: true },
  });
  for (const data of [undefined, new Uint8Array()]) {
    const transaction = await client.triggerSmartContract({
      from: 'TYyZWnBnacweQKQFnt3djHF37LHJjmBZwn',
      to: 'TRPFF7y1LRVQJxDEkryAxfwGwWRhbQmvve',
      ...(data !== undefined ? { data } : {}),
      value: 1000000,
      feeLimit: 10000000,
    });
    assert(
      transaction.serialize().toHex() ===
        '0a02c72622084362204af608363e4098f7e2b69c345a6b081f12670a31747970652e676f6f676c65617069732e636f6d2f70726f74' +
          '6f636f6c2e54726967676572536d617274436f6e747261637412320a1541fc5c0414aae677a12fa83f5ac1421ab0b2cd6a731215' +
          '41a915bde2aae6dd4711b6166841ff0705fa7712e118c0843d70b1b1dfb69c34900180ade204',
    );
    assert(transaction.hash() === 'f3fbb4ff63e79f5e3f9f593097e64eaf7bd3f5395b5d77016877230b6226aaba');
  }
});
