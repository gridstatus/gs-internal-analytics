import { Pool } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';

const pool = new Pool({
  user: process.env.APPLICATION_POSTGRES_USER,
  password: process.env.APPLICATION_POSTGRES_PASSWORD,
  host: process.env.APPLICATION_POSTGRES_HOST,
  database: process.env.APPLICATION_POSTGRES_DATABASE,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Request-scoped context for storing timezone and other request-level settings.
 * This allows the query function to read the timezone without threading it through
 * every function call.
 */
export interface RequestContext {
  timezone?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    // Read timezone from async context, default to UTC
    const store = requestContext.getStore();
    const timezone = store?.timezone || 'UTC';
    
    // Set the session timezone before executing the query
    await client.query(`SET timezone TO '${timezone}'`);
    
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Extracts error message from database errors for API responses.
 * Returns the SQL error message if available, otherwise the error string.
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

export default pool;
