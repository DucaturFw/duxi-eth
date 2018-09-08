import r from 'rethinkdb'
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_TRANSFERS} from './config'

async function syncTransfers(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string, transfersTable: string) {
    let transfers = await DB.getTransfers(conn, db, txsTable, receiptsTable, transfersTable)
    transfers.each(async (err: any, hash: string) => {
        if (err) console.error(err)
        console.log('Syncing tx: ', hash)
        const tx = await web3.eth.getTransaction(hash)
        console.log('Got transaction:', tx.hash)
        DB.insert(conn, db, txsTable, tx)
    })
}

export async function syncTransfersFromNode() {
    console.log("starting transfers syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTransfersTable(conn, db, TABLE_TRANSFERS)
    
	await syncTransfers(conn, db, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_TRANSFERS)
}