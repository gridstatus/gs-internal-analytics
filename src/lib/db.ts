import { Pool } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import { DEFAULT_TIMEZONE } from './timezones';

/** Max concurrent DB queries; excess wait for a connection. */
const DB_MAX_CONCURRENT = 2;

const pool = new Pool({
  user: process.env.APPLICATION_POSTGRES_USER,
  password: process.env.APPLICATION_POSTGRES_PASSWORD,
  host: process.env.APPLICATION_POSTGRES_HOST,
  database: process.env.APPLICATION_POSTGRES_DATABASE,
  port: 5432,
  max: DB_MAX_CONCURRENT,
  ssl: {
    rejectUnauthorized: false,
  },
  // Set 30 second statement timeout for all queries
  statement_timeout: 30000,
});

/**
 * Request-scoped context for storing timezone and filter settings.
 * Set by withRequestContext(); read by renderSqlTemplate/renderHogqlTemplate and formatDateOnly.
 */
export interface RequestContext {
  timezone?: string;
  filterInternal?: boolean;
  filterFree?: boolean;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    // Read timezone from async context, default to CT
    const store = requestContext.getStore();
    const timezone = store?.timezone || DEFAULT_TIMEZONE;
    
    // Set session settings: timezone and 30-second statement timeout
    await client.query(`SET timezone TO '${timezone}'; SET statement_timeout = '30s'`);
    
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    // Log the SQL that caused the error for debugging
    console.error('SQL Error - Query:', sql);
    console.error('SQL Error - Params:', params);
    // Enhance error with SQL context and stack trace
    if (error instanceof Error) {
      // Extract relevant stack frames (skip node_modules and internal files)
      const stackLines = error.stack?.split('\n') || [];
      const relevantStack = stackLines
        .filter(line => {
          const hasSrc = line.includes('src/');
          const noNodeModules = !line.includes('node_modules');
          const noInternal = !line.includes('node:') && !line.includes('internal/');
          return hasSrc && noNodeModules && noInternal;
        })
        .slice(0, 10) // Get up to 10 relevant frames
        .map(line => {
          // Extract file path and line number: "at functionName (file:line:col)" or "at file:line:col"
          const match = line.match(/at\s+(?:\w+\s+\()?([^\s()]+):(\d+):(\d+)/);
          if (match) {
            const [, file, lineNum, col] = match;
            // Clean up file path to be relative to project root
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
