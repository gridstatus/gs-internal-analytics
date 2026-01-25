import { Pool } from 'pg';

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

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
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
