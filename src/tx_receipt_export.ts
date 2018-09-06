console.log("starting tx syncer")

import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TX_RECEIPTS, TABLE_TXS} from './config'

async function syncTxReceipts(conn, db, txsTable, receiptsTable) {
    let blocks = await DB.getPendingReceipts(conn, db, txsTable, receiptsTable)
    blocks.each(async (err, hash) => {
        if (err) console.error(err)
        console.log('Syncing receipt for tx: ', hash)
        const receipt = await web3.eth.getTransactionReceipt(hash)
        if (receipt) {
            // replace `transactionHash` with `hash` for uniformity
            const txRec = {...receipt, hash}
            delete txRec.transactionHash
            console.log('Got transaction:', txRec.hash)
            DB.insert(conn, db, receiptsTable, txRec)
        } else {
            console.error('Transaction receipt is empty: ', hash)
        }
    })
}

export async function syncBlocksFromNode() {
	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTxReceiptsTable(conn, db, TABLE_TX_RECEIPTS)
    
	syncTxReceipts(conn, db, TABLE_TXS, TABLE_TX_RECEIPTS)
}