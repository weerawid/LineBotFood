import { createClient } from "@libsql/client"
import type { Client } from "@libsql/client"
import { getContext } from "../context/app_context.js";
import { AppError, ErrorKey } from "../error/error.app.js";

let dbClient: Client | null = null;

export interface DBConfig {
  url: string,
  authToken: string
}

export class DBClientManager {
  private static instance: DBClientManager | null = null;
  private client: Client | null = null;
  private config: DBConfig | null = null;
  private isConnected: boolean = false;

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}

  /**
   * Get singleton instance of DBClientManager
   */
  static getInstance(): DBClientManager {
    if (!this.instance) {
      this.instance = new DBClientManager();
    }
    return this.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Initialize and connect to database
   */
  async connect() {
    try {
      if (this.isConnected && this.client != null) {
        console.log("Database already connected")
        return;
      }

      const context = await getContext()
      const config = context.config as Record<string, string>;

      this.config = { url: config["TURSO_URL"], authToken: config["TURSO_TOKEN"] }
      this.client = createClient({
        url: this.config.url,
        authToken: this.config.authToken,
      });

      this.isConnected = true
      console.log("Database connected successfully")
    } catch (e) {
      throw new AppError(ErrorKey.DB_CONNECT_FAILURE_00300, `connect: ${e}`);
    }
  }

  /**
   * Execute raw SQL query
   */
  async execute<T = any>(sql: string, params?: any[]): Promise<T> {
    if (!this.client || !this.isConnected) {
      await this.connect()
    }

    try {
      const result = await this.client!.execute(sql, params);
      return result as T;
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `execute: Database execution failed: ${error}`);
    }
  }

  async getSQLData<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.client || !this.isConnected) {
      await this.connect()
    }

    try {
      const result = await this.client!.execute(sql, params);
      return result.rows as T[];
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `getSQLData: Database execution failed: ${error}`);
    }
  } 

  async getRowsCount(table: string, whereClause: Record<string, any>): Promise<number> {
    if (!this.client || !this.isConnected) {
      await this.connect()
    }

    try {
      const whereConditions = Object.keys(whereClause).map(col => `${col} = ?`).join(" AND ");
      const params = Object.values(whereClause);
      const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereConditions}`;
      const result = await this.client!.execute(sql, params);
      return result.rows[0].count as number || 0;
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `getRowsCount: Database execution failed: ${error}`);
    }
  }
  /**
   * Execute batch queries
   */
  async executeBatch<T = any>(queries: Array<{ sql: string; params?: any[] }>): Promise<T[]> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      const results = await Promise.all(
        queries.map((query) => this.client!.execute(query.sql, query.params))
      );
      return results as T[];
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `executeBatch: Batch execution failed: ${error}`);
    }
  }

  async selectAll<T = any>(table: string, whereClause?: Record<string, any> | null): Promise<T[]> {
    if (!this.client || !this.isConnected) {
      await this.connect()
    }

    try {
      let sql = `SELECT * FROM ${table}`;
      let params: any[] = [];

      if (whereClause && Object.keys(whereClause).length > 0) {
        const whereConditions = Object.keys(whereClause).map(col => `${col} = ?`).join(" AND ");
        sql += ` WHERE ${whereConditions}`;
        params = Object.values(whereClause);
      }
      // console.log(`sql: ${sql}`)
      const result = await this.client!.execute(sql, params);
      return result.rows as T[];
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `selectAll: Database execution failed: ${error}`);
    }
  }

  async selectOne<T = any>(table: string, whereClause: Record<string, any>): Promise<T | null> {
    const results = await this.selectAll<T>(table, whereClause);
    if (results.length > 0) {
      return results[0];
    } else {
      return null;
    }
  }

  /**
   * Insert data into table
   * @param table - Table name
   * @param values - Object with column names as keys and values
   * @returns Execution result
   *
   * Usage:
   * await manager.insert('users', {
   *   name: 'John',
   *   email: 'john@example.com',
   *   age: 30
   * });
   */
  async insert(table: string, values: Record<string, any>): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      if (!table || typeof table !== 'string') {
        throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301,"Table name must be a non-empty string");
      }

      // Validate values object
      if (!values || typeof values !== 'object' || Array.isArray(values)) {
        throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301,"Values must be a non-empty object");
      }

      const columns = Object.keys(values);
      if (columns.length === 0) {
        throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, "At least one column must be provided");
      }

      const columnNames = columns.join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      // Handle null/undefined values - convert undefined to null
      const params = columns.map((col) => {
        const value = values[col];
        if (value instanceof Date) {
          return value.toISOString()
        } else {
          return value === undefined ? null : values[col]
        }
      });

      // Build SQL query
      const sql = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`;
      const result = await this.client!.execute(sql, params);
      return result.rowsAffected === 1;
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `insert: Insert operation failed: ${error}`);
    }
  }

  async update(table: string, values: Record<string, any>, whereClause: Record<string, any>): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      if (!table || typeof table !== 'string') {
        throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301,"Table name must be a non-empty string");
      }

      // Validate values object
      if (!values || typeof values !== 'object' || Array.isArray(values)) {
        throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301,"Values must be a non-empty object");
      }
      const valueFiltered =  Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined)
      )
      if (Object.keys(valueFiltered).length === 0) {
        throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, "At least one column must be provided for update");
      }
      const columns = Object.keys(valueFiltered);
      if (columns.length === 0) {
        throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, "At least one column must be provided");
      }

      const setClause = columns.map(col => `${col} = ?`).join(", ");
      const params = columns.map((col) => {
        const value = values[col];
        if (value instanceof Date) {
          return value.toISOString()
        } else {
          return value === undefined ? null : values[col]
        }
      });

      const whereClauseConditions = Object.keys(whereClause).map(col => `${col} = ?`).join(" AND ");
      const whereParams = Object.values(whereClause);

      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClauseConditions}`;
      // console.log(`Update sql ${sql}:`, [...params, ...whereParams]);
      const result = await this.client!.execute(sql, [...params, ...whereParams]);
      return result.rowsAffected === 1;
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `update: Update operation failed: ${error}`);
    }
  }

  /**
   * Custom database operation - can be used to define reusable methods
   * Usage: manager.custom<User>('selectUserById', async (client) => {
   *   return await client.execute('SELECT * FROM users WHERE id = ?', [1]);
   * })
   */
  async custom<T = any>(
    operationName: string,
    operation: (client: Client) => Promise<T>
  ): Promise<T> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      console.log(`Executing custom operation: ${operationName}`);
      const result = await operation(this.client!);
      return result as T;
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `custom: Custom operation '${operationName}' failed: ${error}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        // Close connection if client supports it
        if (typeof (this.client as any).close === "function") {
          await (this.client as any).close();
        }
      }
      this.client = null;
      this.isConnected = false;
      console.log("Database disconnected");
    } catch (error) {
      throw new AppError(ErrorKey.DB_EXECUTION_FAILURE_00301, `disconnect: Failed to disconnect: ${error}`);
    }
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get current config (without token for security)
   */
  getConfig(): Partial<DBConfig> | null {
    if (!this.config) return null;
    return { url: this.config.url };
  }
}