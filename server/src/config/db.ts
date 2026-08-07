import mysql from 'mysql2/promise';
import { env } from './env';

// Create MySQL connection pool
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  multipleStatements: true,
  dateStrings: true,
});

// Utility for single queries that mimics pg query return format: { rows: T[], rowCount: number }
export const query = async <T = unknown>(text: string, params?: unknown[]) => {
  let mysqlQuery = text;
  let mysqlParams: unknown[] = params ? [...params] : [];

  // Convert PostgreSQL $1, $2, etc. placeholders to MySQL ? placeholders
  if (params && /\$\d+/.test(text)) {
    mysqlParams = [];
    mysqlQuery = text.replace(/\$(\d+)/g, (_, indexStr) => {
      const idx = parseInt(indexStr, 10) - 1;
      mysqlParams.push((params as unknown[])[idx]);
      return '?';
    });
  }

  // Convert common PostgreSQL syntax to MySQL syntax automatically if present
  mysqlQuery = mysqlQuery.replace(/\bILIKE\b/gi, 'LIKE');

  // Check if query has RETURNING clause at the end
  const returningMatch = mysqlQuery.match(/\bRETURNING\b\s+(.+)$/i);
  let returningCols: string[] = [];
  if (returningMatch) {
    returningCols = returningMatch[1].split(',').map((c) => c.trim());
    mysqlQuery = mysqlQuery.replace(/\bRETURNING\b\s+(.+)$/i, '');
  }

  const [result] = await pool.query(mysqlQuery, mysqlParams);

  if (Array.isArray(result)) {
    return { rows: result as (T & Record<string, unknown>)[], rowCount: result.length };
  } else {
    const header = result as mysql.ResultSetHeader;
    let rows: (T & Record<string, unknown>)[] = [];

    // If RETURNING was requested and insertId exists or id parameter was passed, fetch the inserted row
    if (returningCols.length > 0 && header.insertId) {
      const [selectRows] = await pool.query(
        `SELECT ${returningCols.join(', ')} FROM ${getTableNameFromQuery(mysqlQuery)} WHERE id = ?`,
        [header.insertId]
      );
      if (Array.isArray(selectRows)) {
        rows = selectRows as (T & Record<string, unknown>)[];
      }
    } else if (returningCols.length > 0) {
      // Look if 'id' was passed as first value in insert/update
      const idMatch = mysqlQuery.match(/WHERE\s+id\s*=\s*\?/i);
      if (idMatch && mysqlParams.length > 0) {
        const idVal = mysqlParams[mysqlParams.length - 1];
        const [selectRows] = await pool.query(
          `SELECT ${returningCols.join(', ')} FROM ${getTableNameFromQuery(mysqlQuery)} WHERE id = ?`,
          [idVal]
        );
        if (Array.isArray(selectRows)) rows = selectRows as (T & Record<string, unknown>)[];
      }
    }

    return { rows, rowCount: header.affectedRows };
  }
};

function getTableNameFromQuery(q: string): string {
  const insertMatch = q.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
  if (insertMatch) return insertMatch[1];
  const updateMatch = q.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
  if (updateMatch) return updateMatch[1];
  const deleteMatch = q.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);
  if (deleteMatch) return deleteMatch[1];
  return 'users';
}

// Utility for transactions
export const withTransaction = async <T>(
  fn: (client: { query: typeof query }) => Promise<T>
): Promise<T> => {
  const conn = await pool.getConnection();
  const txClient = {
    query: async <R = unknown>(text: string, params?: unknown[]) => {
      let mysqlQuery = text;
      let mysqlParams: unknown[] = params ? [...params] : [];
      if (params && /\$\d+/.test(text)) {
        mysqlParams = [];
        mysqlQuery = text.replace(/\$(\d+)/g, (_, indexStr) => {
          const idx = parseInt(indexStr, 10) - 1;
          mysqlParams.push((params as unknown[])[idx]);
          return '?';
        });
      }
      mysqlQuery = mysqlQuery.replace(/\bILIKE\b/gi, 'LIKE');
      const returningMatch = mysqlQuery.match(/\bRETURNING\b\s+(.+)$/i);
      let returningCols: string[] = [];
      if (returningMatch) {
        returningCols = returningMatch[1].split(',').map((c) => c.trim());
        mysqlQuery = mysqlQuery.replace(/\bRETURNING\b\s+(.+)$/i, '');
      }

      const [result] = await conn.query(mysqlQuery, mysqlParams);
      if (Array.isArray(result)) {
        return { rows: result as (R & Record<string, unknown>)[], rowCount: result.length };
      } else {
        const header = result as mysql.ResultSetHeader;
        let rows: (R & Record<string, unknown>)[] = [];
        if (returningCols.length > 0) {
          const tbl = getTableNameFromQuery(mysqlQuery);
          if (header.insertId) {
            const [sel] = await conn.query(`SELECT ${returningCols.join(', ')} FROM ${tbl} WHERE id = ?`, [header.insertId]);
            if (Array.isArray(sel)) rows = sel as (R & Record<string, unknown>)[];
          } else if (mysqlQuery.match(/INSERT\s+INTO\s+[a-zA-Z0-9_]+\s*\([^)]*\b(id)\b/i) && mysqlParams.length > 0) {
            // Check if ID was explicitly provided in insert params
            const idIdx = getInsertIdIndex(mysqlQuery);
            if (idIdx !== -1 && mysqlParams[idIdx]) {
              const [sel] = await conn.query(`SELECT ${returningCols.join(', ')} FROM ${tbl} WHERE id = ?`, [mysqlParams[idIdx]]);
              if (Array.isArray(sel)) rows = sel as (R & Record<string, unknown>)[];
            }
          } else if (mysqlQuery.match(/WHERE\s+.*id\s*=\s*\?/i) && mysqlParams.length > 0) {
            const idVal = mysqlParams[mysqlParams.length - 1];
            const [sel] = await conn.query(`SELECT ${returningCols.join(', ')} FROM ${tbl} WHERE id = ?`, [idVal]);
            if (Array.isArray(sel)) rows = sel as (R & Record<string, unknown>)[];
          }
        }
        return { rows, rowCount: header.affectedRows };
      }
    },
  };

  try {
    await conn.beginTransaction();
    const result = await fn(txClient);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

function getInsertIdIndex(q: string): number {
  const match = q.match(/INSERT\s+INTO\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)/i);
  if (!match) return -1;
  const cols = match[1].split(',').map((c) => c.trim().toLowerCase());
  return cols.indexOf('id');
}
