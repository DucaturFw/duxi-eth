import r from "rethinkdb"

export async function connect(node: string, db: string) {
    let conn = await r.connect(node.replace(/^http\:\/\//, '').replace(/\:\d+$/, ''))
    let rdb = r.db(db);
    return { conn, db: rdb }
}

export async function checkBlocksTable(conn: r.Connection, db: r.Db, name: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(name) == -1) {
        await db.tableCreate(name, { primaryKey: "number" }).run(conn)
    }

    // add indexes
    let indexes = await db.table(name).indexList().run(conn)
    if (indexes.indexOf('hash') == -1) {
        await db.table(name).indexCreate('hash').run(conn)
    }
}

export async function checkTxsTable(conn: r.Connection, db: r.Db, name: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(name) == -1) {
        await db.tableCreate(name, { primaryKey: 'hash' }).run(conn)
    }

    // add indexes
    let indexes = await db.table(name).indexList().run(conn)
    if (indexes.indexOf('from') == -1) {
        await db.table(name).indexCreate('from').run(conn)
    }
    if (indexes.indexOf('to') == -1) {
        await db.table(name).indexCreate('to').run(conn)
    }
}

export async function getLastSyncedBlock(conn, db, table) {
	return db.table(table).max('number').default(-1).run(conn)
}

export async function insert(conn, db, table, obj) {
	return db.table(table).insert(obj).run(conn)
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

export async function checkTxReceiptsTable(conn: r.Connection, db: r.Db, name: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(name) == -1) {
        // initially it has `transactionHash` field,
        // but we replace it with `hash` for uniformity
        await db.tableCreate(name, { primaryKey: 'hash' }).run(conn)
    }

    // add indexes
    let indexes = await db.table(name).indexList().run(conn)
    if (indexes.indexOf('from') == -1) {
        await db.table(name).indexCreate('from').run(conn)
    }
    if (indexes.indexOf('to') == -1) {
        await db.table(name).indexCreate('to').run(conn)
    }
    if (indexes.indexOf('contractAddress') == -1) {
        await db.table(name).indexCreate('contractAddress').run(conn)
    }
    if (indexes.indexOf('logs') == -1) {
        await db.table(name).indexCreate('logs').run(conn)
    }
}