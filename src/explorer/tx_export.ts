import r from 'rethinkdb'
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TXS, TABLE_BLOCKS, REPEATS_LIMIT} from './config'

async function syncTxs(conn: r.Connection, db: r.Db, blocksTable: string, txsTable: string) {
    let blocks = await DB.getPendingTxs(conn, db, blocksTable, txsTable)
    blocks.each(async (err: any, hash: string) => {
        if (err) console.error(err)
        for (let i = 0; i < REPEATS_LIMIT; ++i) {
            try {
                console.log('Syncing tx: ', hash)
                const tx = await web3.eth.getTransaction(hash)
                console.log('Got transaction:', tx.hash)
                DB.insert(conn, db, txsTable, tx)
                break
            } catch (inErr) {
                console.log(`Error while retrieving transaction ${hash} (${i + 1})`, inErr.message)
            }
        }
    })
}

export async function syncTxsFromNode() {
    console.log("starting tx syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTxsTable(conn, db, TABLE_TXS)
    
	await syncTxs(conn, db, TABLE_BLOCKS, TABLE_TXS)
}