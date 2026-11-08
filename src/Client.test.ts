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
