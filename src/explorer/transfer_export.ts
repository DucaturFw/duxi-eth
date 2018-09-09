import r from 'rethinkdb'
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_TRANSFERS, TYPES_MAP} from './config'

const ERC_NAME_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
]

async function syncTransfers(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string, transfersTable: string) {
    let transfers = await DB.getTransfers(conn, db, txsTable, receiptsTable, transfersTable)
    transfers.each(async (err: any, transfer: any) => {
        if (err) console.error(err)
        console.log('Syncing tx: ', transfer.hash)
        let from_hash: any = null;
        if (transfer.logs) {
            transfer.logs.forEach(async (log: any) => {
                let type = TYPES_MAP[log.topics[0]]
                if (type) {
                    let from = log.topics[1]
                    let to = log.topics[2]
                    let amount = log.data.substring(0, 66)
                    from_hash = [from, transfer.hash]
                    const contract = new web3.eth.Contract(ERC_NAME_ABI, log.address);
                    const name = await contract.methods.name().call({from: '0x0'})
                    console.debug(`Detected token ${name} transfer: `, log.address)
                    await DB.insert(conn, db, transfersTable, { from_hash, from, hash: transfer.hash, to, amount, name })
                }
            });
        } else {
            let from = transfer.from
            let to = transfer.to
            let amount = transfer.value
            from_hash = [from, transfer.hash]
            await DB.insert(conn, db, transfersTable, { from_hash, from, to, hash: transfer.hash, amount, name: 'ETH' })
        }
    })
}

export async function syncTransfersFromNode() {
    console.log("starting transfers syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTransfersTable(conn, db, TABLE_TRANSFERS)
    
	await syncTransfers(conn, db, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_TRANSFERS)
}