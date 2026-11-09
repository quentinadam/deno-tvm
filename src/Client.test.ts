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
