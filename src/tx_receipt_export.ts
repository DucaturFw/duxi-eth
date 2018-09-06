import r from 'rethinkdb'
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TX_RECEIPTS, TABLE_TXS} from './config'

async function syncTxReceipts(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string) {
    let txs = await DB.getPendingReceipts(conn, db, txsTable, receiptsTable)
    txs.each(async (err: any, tx: any) => { // tx is tx object
        if (err) console.error(err)
        console.log('Syncing receipt for tx: ', tx.hash)
        let receipt;
        try {
            receipt = await web3.eth.getTransactionReceipt(tx.hash)
        } catch (err) {
            console.error('Failed to fetch receipt for transaction', tx.hash, err)
        }
        if (receipt) {
            // replace `transactionHash` with `hash` for uniformity
            const txRec = {...receipt, hash: tx.hash}
            delete txRec.transactionHash
            console.log('Got transaction:', txRec.hash)
            DB.insert(conn, db, receiptsTable, txRec)
        } else {
            console.error('Transaction receipt is empty: ', tx.hash)
        }
    })
}

export async function syncTxReceiptsFromNode() {
    console.log("starting receipt syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTxReceiptsTable(conn, db, TABLE_TX_RECEIPTS)
    
	syncTxReceipts(conn, db, TABLE_TXS, TABLE_TX_RECEIPTS)
}