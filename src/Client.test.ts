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

function createClientReplying(reply: unknown) {
  const fetcher = {
    fetch: async (_url: string, _options?: RequestInit) => await Promise.resolve(Response.json(reply)),
  };
  return new Client('https://api.example', { fetcher });
}

Deno.test('Client triggers a smart contract with a zero call value, which the node omits', async () => {
  // Nile reply to { data: '8456cb59', fee_limit: 10000000, call_value: 0 }.
  const client = createClientReplying({
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
  const client = createClientReplying({
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

Deno.test('Client deploys a contract with the default energy sharing, checking what the node builds', async () => {
  // Nile reply to { abi: '[]', bytecode, parameter, call_value: 0, consume_user_resource_percent: 100,
  // origin_energy_limit: 10000000, fee_limit: 100000000, name: 'Probe' }, the bytecode then holding the parameter.
  const client = createClientReplying({
    raw_data: {
      ref_block_bytes: '3906',
      ref_block_hash: 'a7b76d0e0c307ef1',
      expiration: 1795806066000,
      contract: [{
        parameter: {
          value: {
            owner_address: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
            new_contract: {
              origin_address: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
              abi: {},
              bytecode:
                '6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea164736f6c634300' +
                '0706000a00000000000000000000000024b7784dbfc673d39cea8f9ab537c29f5b7169d3',
              consume_user_resource_percent: 100,
              name: 'Probe',
              origin_energy_limit: 10000000,
            },
          },
          type_url: 'type.googleapis.com/protocol.CreateSmartContract',
        },
        type: 'CreateSmartContract',
      }],
      timestamp: 1795806008714,
      fee_limit: 100000000,
    },
    contract_address: '41e591c3bec28f8db55637a4c3cdf3b3b9a9e26b7c',
    raw_data_hex: '0a0239062208a7b76d0e0c307ef140d0ea87f3a1345acf01081e12ca010a30747970652e676f6f676c65617069732e636f' +
      '6d2f70726f746f636f6c2e437265617465536d617274436f6e74726163741295010a1541d22d8dcafa5c495ba37986d9a2d6c5474d28cd' +
      '21127c0a1541d22d8dcafa5c495ba37986d9a2d6c5474d28cd211a0022536080604052348015600f57600080fd5b50603e80601d600039' +
      '6000f3fe6080604052600080fdfea164736f6c6343000706000a00000000000000000000000024b7784dbfc673d39cea8f9ab537c29f5b' +
      '7169d330643a0550726f62654080ade204708aab84f3a134900180c2d72f',
    txID: 'abbab1fb59f86c9f6f980543139707ba4991b58754716693edb876f3853eed0b',
    visible: true,
  });
  const transaction = await client.deployContract({
    from: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
    data: Uint8Array.fromHex(
      '6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea164736f6c6343000706000a' +
        '00000000000000000000000024b7784dbfc673d39cea8f9ab537c29f5b7169d3',
    ),
    name: 'Probe',
    feeLimit: 100000000,
  });
  assert(transaction.hash() === 'abbab1fb59f86c9f6f980543139707ba4991b58754716693edb876f3853eed0b');
  assert(transaction.contractAddress() === 'TWu4MthYNX6pmKms1Gikhx1u1n5LbQwG2D');
});

Deno.test('Client deploys a contract with no name, origin energy limit or fee limit, which the node omits', async () => {
  // Nile reply to { abi: '[]', bytecode: '6080', consume_user_resource_percent: 100, origin_energy_limit: 0 }.
  const client = createClientReplying({
    raw_data: {
      ref_block_bytes: '392d',
      ref_block_hash: 'c00bfb194695f3d1',
      expiration: 1795806183000,
      contract: [{
        parameter: {
          value: {
            owner_address: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
            new_contract: {
              origin_address: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
              abi: {},
              bytecode: '6080',
              consume_user_resource_percent: 100,
            },
          },
          type_url: 'type.googleapis.com/protocol.CreateSmartContract',
        },
        type: 'CreateSmartContract',
      }],
      timestamp: 1795806124870,
    },
    contract_address: '41b674ad5417ef38f04493bafd8992a97d4f51e9a2',
    raw_data_hex:
      '0a02392d2208c00bfb194695f3d140d8fc8ef3a1345a70081e126c0a30747970652e676f6f676c65617069732e636f6d2f70' +
      '726f746f636f6c2e437265617465536d617274436f6e747261637412380a1541d22d8dcafa5c495ba37986d9a2d6c5474d28cd21121f0a' +
      '1541d22d8dcafa5c495ba37986d9a2d6c5474d28cd211a0022026080306470c6b68bf3a134',
    txID: 'a7cdc9832ed45da8a8405e33a3db5b52d8fe41f2f911b0f377374f0307dddd19',
    visible: true,
  });
  const transaction = await client.deployContract({
    from: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
    data: Uint8Array.fromHex('6080'),
    consumeUserResourcePercent: 100,
    originEnergyLimit: 0,
  });
  assert(transaction.hash() === 'a7cdc9832ed45da8a8405e33a3db5b52d8fe41f2f911b0f377374f0307dddd19');
});

Deno.test("Client fails a deployment with the node's error", async () => {
  // Nile reply to a bytecode that is not hexadecimal.
  const client = createClientReplying({ Error: 'internal server error' });
  const error = await client.deployContract({
    from: 'TV8XUUvt56V9KgHdVjzEuZPBhiCfQbd177',
    data: Uint8Array.fromHex('6080'),
    consumeUserResourcePercent: 100,
    originEnergyLimit: 10000000,
  }).then(() => undefined, (error: unknown) => error);
  assert(error instanceof Error && error.message === 'internal server error');
});
