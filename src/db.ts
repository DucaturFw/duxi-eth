import r from "rethinkdb"

export async function connect(node: string, db: string) {
    let conn = await r.connect(node.replace(/^http\:\/\//, '').replace(/\:\d+$/, ''))
    let rdb = r.db(db);
    return { conn, db: rdb }
}

async function createSimpleIndex(conn, db, table, index_name) {
    let indexes = await db.table(table).indexList().run(conn)
    if (indexes.indexOf(index_name) == -1) {
        await db.table(table).indexCreate(index_name).run(conn)
        await db.table(table).indexWait(index_name).run(conn)
    }
}

export async function checkBlocksTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        await db.tableCreate(table, { primaryKey: "number" }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['hash']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function checkTxsTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        await db.tableCreate(table, { primaryKey: 'hash' }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['from', 'to']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function checkTxReceiptsTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        // initially it has `transactionHash` field,
        // but we replace it with `hash` for uniformity
        await db.tableCreate(table, { primaryKey: 'hash' }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['from', 'to', 'contractAddress', 'logs']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function getLastSyncedBlock(conn, db, table) {
	return db.table(table).max('number').default(-1).run(conn)
}

export async function insert(conn, db, table, obj) {
	return db.table(table).insert(obj).run(conn)
}

export async function get(conn, db, table, idx) {
	return db.table(table).get(idx).run(conn)
}

export async function getPendingTxs(conn, db, blocksTable, txsTable) {
    return db.table(blocksTable)
        .changes({ includeInitial: true })
        .map(x => x('new_val'))
        .concatMap(x => x('transactions'))
        .filter(a => db.table(txsTable).getAll(a).isEmpty())
        .run(conn) as r.CursorResult<{ hash: string }>
}

export async function getPendingReceipts(conn, db, txsTable, receiptsTable) {
    return db.table(txsTable)
        .changes({ includeInitial: true })
        .map(x => x('new_val'))
        .concatMap(x => [x('hash')])
        .filter(a => db.table(receiptsTable).getAll(a).isEmpty())
        .run(conn) as r.CursorResult<{ hash: string }>
}