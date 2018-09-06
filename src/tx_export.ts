console.log("starting tx syncer")

import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TXS, TABLE_BLOCKS} from './config'

async function syncTxs(conn, db, blocksTable, txsTable) {
    let blocks = await DB.getPendingTxs(conn, db, blocksTable, txsTable)
    blocks.each(async (err, hash) => {
        if (err) console.error(err)
        console.log('Syncing tx: ', hash)
        const tx = await web3.eth.getTransaction(hash)
        console.log('Got transaction:', tx.hash)
        DB.insert(conn, db, txsTable, tx)
    })
}

export async function syncBlocksFromNode() {
	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTxsTable(conn, db, TABLE_TXS)
    
	syncTxs(conn, db, TABLE_BLOCKS, TABLE_TXS)
}