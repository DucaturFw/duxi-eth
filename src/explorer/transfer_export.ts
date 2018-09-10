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
const contract = new web3.eth.Contract(ERC_NAME_ABI)

async function transferFromLog(log: any, hash: string) {
    const type = TYPES_MAP[log.topics[0]]
    console.debug('Detected type:', type)
    switch (type) {
        case 'ERC20':
        case 'ERC223':
            const from = log.topics[1],
                  to = log.topics[2],
                  data = log.data.replace(/^0x/, '')
            const amount = web3.utils.hexToNumberString(data.substring(0, 64)),
                  restData = data.substring(64),
                  from_to_hash = [from, to, hash]
            contract.options.address = log.address
            const name = await contract.methods.name().call()
            console.debug(`Detected token transfer ${name}:`, log.address)
            return {
                hash: hash,
                from_to_hash,
                from,
                to,
                amount,
                name,
                data: restData
            }
    }
    return null
}

function ethTransfer(transfer: any) {
    const from = transfer.from
    const to = transfer.to
    const amount = transfer.value
    const from_to_hash = [from, to, transfer.hash]
    return {
        hash: transfer.hash,
        from_to_hash,
        from,
        to,
        amount,
        name: 'ETH'
    }
}

async function syncTransfers(conn: r.Connection, db: r.Db, txsTable: string, receiptsTable: string, transfersTable: string) {
    let transfers = await DB.getTransfers(conn, db, txsTable, receiptsTable, transfersTable)
    transfers.each(async (err: any, transfer: any) => {
        if (err) return console.error(err)
        console.debug('Syncing tx: ', transfer.hash)
        if (transfer.logs && transfer.logs.length > 0) await Promise.all(
            transfer.logs.map(async (log: any) => {
                const parsedTransfer = await transferFromLog(log, transfer.hash)
                if (parsedTransfer) await DB.insert(conn, db, transfersTable, parsedTransfer)
            })
        );
        if (transfer.value) await DB.insert(conn, db, transfersTable, ethTransfer(transfer))
    })
}

export async function syncTransfersFromNode() {
    console.debug("starting transfers syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkTransfersTable(conn, db, TABLE_TRANSFERS)
    
	await syncTransfers(conn, db, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_TRANSFERS)
}