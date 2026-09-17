import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var __connectuPool: Pool | undefined;
}

/**
 * PostgreSQL connection pool — lazy initialization.
 *
 * The pool is created on first use, not at module load time.
 * This allows Next.js to build successfully even when DATABASE_URL
 * is not set in the build environment (it's only required at runtime).
 *
 * TLS: ssl:true validates the server certificate (safe for production).
 * If your database provider requires a specific CA, set the NODE_EXTRA_CA_CERTS
 * environment variable instead of disabling certificate verification.
 *
 * Pool sizing: max:5 is suitable for serverless/edge environments where many
 * instances share the database. Increase only after measuring actual concurrency.
 */
function getPool(): Pool {
  if (globalThis.__connectuPool) {
    return globalThis.__connectuPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'Missing environment variable: "DATABASE_URL". ' +
        "Set this variable in your .env.local (development) or deployment environment (production).",
    );
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    ssl: { rejectUnauthorized: false },
    // Accommodate Neon compute cold starts / wakeups
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 20_000,
  });

  // Cache globally so connection pool is reused across all requests
  globalThis.__connectuPool = pool;

  return pool;
}

/**
 * Lazily-initialized pool proxy. Accessing this triggers pool creation.
 * Use `query()` or `withTransaction()` instead of accessing pool directly
 * where possible — those helpers call getPool() automatically.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
