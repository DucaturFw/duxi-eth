import r, { ChangesOptions } from 'rethinkdb'
import { RDB_USER, RDB_PWD } from './config';

export async function getOrCreateDatabase(database: string, connection: r.Connection): Promise<r.Db> {
    console.log('Opening database ', database)
    const databases = await r.dbList().run(connection)
    console.log('All dbs:', databases)
    if (databases.indexOf(database) == -1) {
        await r.dbCreate(database).run(connection)
    }
    return r.db(database)
}

export async function connect(node: string, db: string) {
    console.log(`Connecting to '${node}'`)
    let conn = await r.connect({host: node.replace(/^http\:\/\//, '').replace(/\:\d+$/, ''), user: RDB_USER, password: RDB_PWD})
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
        await db.tableCreate(table, { primary_key: "hash" }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['number']
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
    // compound indexes
    let indexes = await db.table(table).indexList().run(conn)
    if (indexes.indexOf('addresses') == -1) {
        console.log(`Creating compound index 'addresses' for table '${table}'`)
        await db.table(table).indexCreate('addresses', [r.row('from'), r.row('to')]).run(conn)
        await db.table(table).indexWait('addresses').run(conn)
    }
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
    const simpleIndexes = ['from', 'to', 'blockNumber']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
    // compound indexes
    let indexes = await db.table(table).indexList().run(conn)
    if (indexes.indexOf('addresses') == -1) {
        console.log(`Creating compound index 'addresses' for table '${table}'`)
        await db.table(table).indexCreate('addresses', [r.row('from'), r.row('to')]).run(conn)
        await db.table(table).indexWait('addresses').run(conn)
    }
}

export async function checkTransfersTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        console.log(`Creating table '${table}'`)
        await db.tableCreate(table, { primary_key: "from_to_hash" }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['hash', 'from', 'to'] // probably `name` would be needed
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function checkContractsTable(conn: r.Connection, db: r.Db, table: string) {
    // create table
    let tables = await db.tableList().run(conn)
    if (tables.indexOf(table) == -1) {
        console.log(`Creating table '${table}'`)
        await db.tableCreate(table, { primary_key: "address" }).run(conn)
    }
    // add indexes
    const simpleIndexes = ['type']
    simpleIndexes.forEach(async (idx: string) => await createSimpleIndex(conn, db, table, idx))
}

export async function getLastSyncedBlock(conn: r.Connection, db: r.Db, table: string) {
	return (db.table(table) as any)
        .max('number')('number')
        .default(0)
        .run(conn)
}

export async function insert(conn: r.Connection, db: r.Db, table: string, obj: any) {
    console.info(`Inserting to '${table}'`)
	return db.table(table).insert(obj).run(conn)
}

export async function update(conn: r.Connection, db: r.Db, table: string, primary_key: string, data: any) {
    console.info(`Updating '${primary_key}' in '${table}'`)
	return db.table(table).get(primary_key).update(data).run(conn)
}

export async function get(conn: r.Connection, db: r.Db, table: string, idx: any, index:string = '') {
    if (index) {
        return db.table(table).getAll(idx, { index }).run(conn)
    }
	return db.table(table).get(idx).run(conn)
}

export async function getPendingTxs(conn: r.Connection, db: r.Db, blocksTable: string, txsTable: string) {
    console.debug('Getting txs from blocks', txsTable, blocksTable)
    return db.table(blocksTable)
        .changes(<ChangesOptions>{ includeInitial: true, squash: 1 })
        .map((x: any) => <any>x('new_val'))
        .concatMap((x: any) => <any>x('transactions'))
        .filter((a: any) => db.table(txsTable).getAll(a).isEmpty())
        .run(conn)
}

export async function getPendingReceipts(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string) {
    console.debug('Getting receipts')
    return db.table(txsTable)
        .changes(<ChangesOptions>{ includeInitial: true, squash: 1 })
        .map((x: any) => <any>x('new_val'))
        .filter((a: any) => db.table(receiptsTable).getAll(a('hash')).isEmpty())
        .run(conn)
}

export async function getContractCreations(conn: r.Connection, db: r.Db, receiptsTable: string, contractsTable: string) {
    console.debug('Getting contracts creations')
    return db.table(receiptsTable)
        .changes(<ChangesOptions>{ includeInitial: true, squash: 5})
        .map((x: any) => <any>x('new_val'))
        .filter((a: any) => a('contractAddress') && db.table(contractsTable).getAll(a('contractAddress')).isEmpty())
        .run(conn)
}

export function getAllTransfers(db: r.Db, txsTable: string, receiptsTable: string) {
    console.debug('Getting transactions')
    return db.table(txsTable).union(db.table(receiptsTable))
        .changes(<ChangesOptions>{ includeInitial: true })
        .map((x: any) => <any>x('new_val'))
}

export async function getTransfers(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string, transfersTable: string) {
    console.debug('Filtering new transfers')
    return getAllTransfers(db, txsTable, receiptsTable)
        .filter((a: any) => db.table(transfersTable).getAll(a('hash'), {index: 'hash'}).isEmpty())
        .run(conn)
}

export async function getContractsCalls(conn: r.Connection, db: r.Db, receiptsTable: string) {
    console.debug('Filtering contract calls (non-empty logs)')
    return db.table(receiptsTable)
        .changes(<ChangesOptions>{ includeInitial: true, squash: 1 })
        .map((x: any) => <any>x('new_val'))
        .run(conn)
}