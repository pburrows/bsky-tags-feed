import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, PostgresDialect, SqliteDialect } from 'kysely'
import { DatabaseSchema } from './schema'
import { migrationProvider } from './migrations'
import {Pool} from 'pg';
import fs from 'fs'

export const createDb = (location: string): Database => {
  const cert = fs.readFileSync('ca-certificate.crt', 'utf8')
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: new Pool({
        database: process.env.FEEDGEN_POSTGRES_DB,
        host: process.env.FEEDGEN_POSTGRES_HOST,
        port: parseInt(process.env.FEEDGEN_POSTGRES_PORT ?? ''),
        max: parseInt(process.env.FEEDGEN_POSTGRES_MAX_CONNECTIONS ?? ''),
        user: process.env.FEEDGEN_POSTGRES_USER,
        password: process.env.FEEDGEN_POSTGRES_PASSWORD,
        ssl: {
          cert: cert,
          rejectUnauthorized: false
        }
      }),
    }),
  })
}

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

export type Database = Kysely<DatabaseSchema>
