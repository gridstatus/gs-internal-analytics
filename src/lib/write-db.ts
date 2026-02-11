import { Pool } from 'pg';

/** Max concurrent write queries; excess wait for a connection. */
const WRITE_DB_MAX_CONCURRENT = 2;

const env = process.env.WRITE_DB_ENV;
if (env !== 'local' && env !== 'prod') {
  throw new Error(
    `WRITE_DB_ENV must be "local" or "prod". Got: ${env ?? '(undefined)'}. Set WRITE_DB_ENV in your environment.`
  );
}

// Safety guardrail: never write to prod from a non-production process (e.g. local dev).
if (env === 'prod' && process.env.NODE_ENV !== 'production') {
  throw new Error(
    'WRITE_DB_ENV=prod is not allowed when NODE_ENV is not "production". Refusing to create write pool.'
  );
}

const prefix = env === 'local' ? 'LOCAL_WRITE_APP' : 'PROD_WRITE_APP';
const writeUseSSL = process.env[`${prefix}_SSL`] !== 'false';

const pool = new Pool({
  user: process.env[`${prefix}_USER`],
  password: process.env[`${prefix}_PASSWORD`],
  host: process.env[`${prefix}_HOST`],
  database: process.env[`${prefix}_DATABASE`],
  port: parseInt(process.env[`${prefix}_PORT`] || '5432', 10),
  max: WRITE_DB_MAX_CONCURRENT,
  ssl: writeUseSSL ? { rejectUnauthorized: false } : false,
  statement_timeout: 30000,
});

export async function writeQuery<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '30s'");
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Write SQL Error - Query:', sql);
    console.error('Write SQL Error - Params:', params);
    if (error instanceof Error) {
      const stackLines = error.stack?.split('\n') || [];
      const relevantStack = stackLines
        .filter(line => {
          const hasSrc = line.includes('src/');
          const noNodeModules = !line.includes('node_modules');
          const noInternal = !line.includes('node:') && !line.includes('internal/');
          return hasSrc && noNodeModules && noInternal;
        })
        .slice(0, 10)
        .map(line => {
          const match = line.match(/at\s+(?:\w+\s+\()?([^\s()]+):(\d+):(\d+)/);
          if (match) {
            const [, file, lineNum, col] = match;
            const cleanPath = file.replace(/^.*\/gs-internal-analytics\//, '').replace(/^.*\/src\//, 'src/');
            return `${cleanPath}:${lineNum}:${col}`;
          }
          return line.trim();
        })
        .join('\n');
      const enhancedMessage = `${error.message}\n\nSQL Query:\n${sql}\n\nParams: ${JSON.stringify(params || [])}${relevantStack ? `\n\nStack trace:\n${relevantStack}` : ''}`;
      const enhancedError = new Error(enhancedMessage);
      enhancedError.stack = error.stack;
      throw enhancedError;
    }
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
