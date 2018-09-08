import r from 'rethinkdb'
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_CONTRACTS} from './config'

async function syncContracts(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string, contractsTable: string) {
    let transfers = await DB.getContracts(conn, db, txsTable, receiptsTable, contractsTable)
    transfers.each(async (err: any, hash: string) => {
        if (err) console.error(err)
        console.log('Syncing tx: ', hash)
        const tx = await web3.eth.getTransaction(hash)
        console.log('Got transaction:', tx.hash)
        DB.insert(conn, db, txsTable, tx)
    })
}

export async function syncContractsFromNode() {
    console.log("starting contracts syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkContractsTable(conn, db, TABLE_CONTRACTS)
    
	await syncContracts(conn, db, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_CONTRACTS)
}