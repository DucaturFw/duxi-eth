import r from 'rethinkdb'
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_TX_RECEIPTS, TABLE_CONTRACTS, TYPES_MAP} from './config'

async function syncContracts(conn: r.Connection, db: r.Db, receiptsTable: string, contractsTable: string) {
    // get new contracts
    let newContracts = await DB.getContractCreations(conn, db, receiptsTable, contractsTable)
    newContracts.each(async (err: any, receipt: any) => {
        if (err) console.error(err)
        console.info('New contract: ', receipt.contractAddress)
        DB.insert(conn, db, contractsTable, {
            address: receipt.contractAddress,
            type: null,
            hash: receipt.hash,
            creator: receipt.from,
            binary: await web3.eth.getCode(receipt.contractAddress)
        })
    })
    // get contract types
    let transfers = await DB.getContractsCalls(conn, db, receiptsTable)
    transfers.each(async (err: any, receipt: any) => {
        // https://ethereum.stackexchange.com/questions/38381/how-can-i-identify-that-transaction-is-erc20-token-creation-contract
        // ERC20: https://ethereum.stackexchange.com/questions/12553/understanding-logs-and-log-blooms
        // ERC223: https://ethereum.stackexchange.com/questions/29455/erc223-backwards-compatibility-with-erc20?rq=1
        if (err) console.error(err)
        if (receipt.logs.length)
            receipt.logs.forEach(async (log: any) => {
                let type = TYPES_MAP[log.topics[0]]
                if (type) {
                    await DB.update(conn, db, contractsTable, log.address, { type });
                }
            });
    })
}

export async function syncContractsFromNode() {
    console.log("starting contracts syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
    await DB.checkContractsTable(conn, db, TABLE_CONTRACTS)
    
	await syncContracts(conn, db, TABLE_TX_RECEIPTS, TABLE_CONTRACTS)
}