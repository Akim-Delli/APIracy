import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface Fixture {
  body: Buffer;
  contentType: string;
  status?: number;
  headers?: Record<string, string>;
}

export interface FixtureServer {
  baseUrl: string;
  fixtures: Map<string, Fixture>;
  close: () => Promise<void>;
}

/** Tiny in-memory HTTP server the routes can fetch "remote" sources from. */
export async function startFixtureServer(): Promise<FixtureServer> {
  const fixtures = new Map<string, Fixture>();
  const server: Server = createServer((req, res) => {
    const fixture = fixtures.get(req.url ?? "");
    if (!fixture) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(fixture.status ?? 200, {
      "content-type": fixture.contentType,
      "content-length": fixture.body.byteLength.toString(),
      ...fixture.headers,
    });
    res.end(fixture.body);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    fixtures,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
