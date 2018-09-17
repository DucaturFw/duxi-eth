import r from 'rethinkdb'
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TX_RECEIPTS, TABLE_TXS} from './config'

async function retry(times: number, func: any, ...args: any[]) {
    let error: Error = new Error('');
    for (let _t = times; _t >= 0; _t--) {
        try {
            return await func(...args)
        } catch (err) {
            error = err;
        }
    }
    console.info(`Failed after ${times} retries:`, error.message)
    throw error
}

async function syncTxReceipts(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string) {
    let txs = await DB.getPendingReceipts(conn, db, txsTable, receiptsTable)
    txs.each(async (err: any, tx: any) => { // tx is tx object
        if (err) console.info(err)
        console.log('Syncing receipt for tx: ', tx.hash)
        let receipt;
        try {
            receipt = await retry(3, web3.eth.getTransactionReceipt, tx.hash)
        } catch (err) {
            console.info('Failed to fetch receipt for transaction', tx.hash, err.message)
        }
        if (receipt) {
            // replace `transactionHash` with `hash` for uniformity
            const txRec = {...receipt, hash: tx.hash}
            delete txRec.transactionHash
            console.debug('Got transaction:', txRec.hash)
            DB.insert(conn, db, receiptsTable, txRec)
        } else {
            console.info('Transaction receipt is empty: ', tx.hash)
        }
    })
}

export async function syncTxReceiptsFromNode() {
    console.debug("starting receipt syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTxReceiptsTable(conn, db, TABLE_TX_RECEIPTS)
    
	await syncTxReceipts(conn, db, TABLE_TXS, TABLE_TX_RECEIPTS)
}