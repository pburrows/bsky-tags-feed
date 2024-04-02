import { Kysely, Migration, MigrationProvider } from 'kysely'

const migrations: Record<string, Migration> = {}

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations
  },
}

migrations['001'] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable('post')
      .addColumn('id', 'integer', (col => col.primaryKey()))
      .addColumn('uri', 'varchar')
      .addColumn('cid', 'varchar', (col) => col.notNull())
      .addColumn('replyParent', 'varchar')
      .addColumn('replyRoot', 'varchar')
      .addColumn('indexedAt', 'varchar', (col) => col.notNull())
      .addColumn('tag', 'varchar')
      .execute()
    await db.schema
      .createTable('sub_state')
      .addColumn('service', 'varchar', (col) => col.primaryKey())
      .addColumn('cursor', 'integer', (col) => col.notNull())
      .execute()
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable('post').execute()
    await db.schema.dropTable('sub_state').execute()
  },
}

migrations['002'] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable('subscriber')
      .addColumn('did', 'varchar', (col => col.primaryKey()))
      .addColumn('createdAt', 'varchar', col => col.notNull())
      .addColumn('lastSeen', 'varchar', (col) => col.notNull())
      .addColumn('followingTags', 'varchar')
      .execute()

  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable('subscriber').execute()
  },
}
