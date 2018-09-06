import r, { ChangesOptions } from 'rethinkdb'

export async function getOrCreateDatabase(database: string, connection: r.Connection): Promise<r.Db> {
    console.log('Opening database ', database)
    const databases = await r.dbList().run(connection)
    if (databases.indexOf(database) === -1) {
        await r.dbCreate(database).run(connection)
    }
    return r.db(database)
}

export async function connect(node: string, db: string) {
    console.log(`Connecting to '${node}'`)
    let conn = await r.connect(node.replace(/^http\:\/\//, '').replace(/\:\d+$/, ''))
    let rdb = await getOrCreateDatabase(db, conn);
    return { conn, db: rdb }
}

async function createSimpleIndex(conn: r.Connection, db: r.Db, table: string, indexName: string) {
    let indexes = await db.table(table).indexList().run(conn)
    if (indexes.indexOf(indexName) == -1) {
        console.log(`Creating index '${indexName}' for table '${table}'`)
        await db.table(table).indexCreate(indexName).run(conn)
        await db.table(table).indexWait(indexName).run(conn)
    }
}

export async function checkBlocksTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        console.log(`Creating table '${table}'`)
        await db.tableCreate(table, { primary_key: "number" }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['hash']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function checkTxsTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        console.log(`Creating table '${table}'`)
        await db.tableCreate(table, { primary_key: 'hash' }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['from', 'to']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function checkTxReceiptsTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        console.log(`Creating table '${table}'`)
        // initially it has `transactionHash` field,
        // but we replace it with `hash` for uniformity
        await db.tableCreate(table, { primary_key: 'hash' }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['from', 'to', 'contractAddress', 'logs']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function getLastSyncedBlock(conn: r.Connection, db: r.Db, table: string) {
	return db.table(table)
        .orderBy({ index: 'number' })
        .nth(-1)('number')
        .default(0)
        .run(conn)
}

export async function insert(conn: r.Connection, db: r.Db, table: string, obj: any) {
    console.info(`Inserting to '${table}'`)
	return db.table(table).insert(obj).run(conn)
}

export async function get(conn: r.Connection, db: r.Db, table: string, idx: any) {
	return db.table(table).get(idx).run(conn)
}

export async function getPendingTxs(conn: r.Connection, db: r.Db, blocksTable: string, txsTable: string) {
    console.debug('Getting txs from blocks', txsTable, blocksTable)
    return db.table(blocksTable)
        .changes(<ChangesOptions>{ includeInitial: true })
        .map((x: any) => <any>x('new_val'))
        .concatMap((x: any) => <any>x('transactions'))
        .filter((a: any) => db.table(txsTable).getAll(a).isEmpty())
        .run(conn)
}

export async function getPendingReceipts(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string) {
    return db.table(txsTable)
        .changes(<ChangesOptions>{ includeInitial: true })
        .map((x: any) => <any>x('new_val'))
        .filter((a: any) => db.table(receiptsTable).getAll(a('hash')).isEmpty())
        .run(conn)
}