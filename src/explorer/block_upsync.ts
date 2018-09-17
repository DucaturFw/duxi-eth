import r from "rethinkdb"
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, START_BLOCK, TABLE_UPSYNC, TABLE_BLOCKS} from './config'

const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time))

async function syncBlock(conn: r.Connection, db: r.Db, table: string, blockNumber: number) {
	const block = await web3.eth.getBlock(blockNumber)
	console.info('Syncing: ', block.number)
	await DB.insert(conn, db, table, block);
	return block;
}

async function getMissingBlocks(conn: r.Connection, db: r.Db, table: string, start: number, end: number) {
    const missing = await (await DB.getBlocksNum(conn, db, table, start, end) as any).toArray()
    const result: number[] = []
    for (let idx: number = start; idx <= end; ++idx) {
        if (missing.indexOf(idx) === -1) {
            result.push(idx);
        }
    }
    return result
}

async function upsyncBlocks(conn: r.Connection, db: r.Db, table: string) {
    let lastBlock = await DB.getLastSyncedBlock(conn, db, TABLE_BLOCKS)
    let lastConcreteBlock: number = await DB.getLastUpsyncedBlock(conn, db, table)
    const startBlock = parseInt(START_BLOCK)
    const step = 1
    console.debug(`last synced block: ${lastBlock}, last concrete block: ${Math.max(lastConcreteBlock, startBlock)}`)
    
    if (lastBlock <= Math.max(lastConcreteBlock, startBlock)) {
        return delay(15000)
    }
    const missingBlocks = await getMissingBlocks(conn, db, TABLE_BLOCKS, Math.max(lastConcreteBlock, startBlock), Math.min(lastBlock, Math.max(lastConcreteBlock, startBlock) + 1000))
	console.debug(`Missing blocks:`, missingBlocks)

	await Promise.all(missingBlocks.map(async (nextBlock: number) => {
		await syncBlock(conn, db, TABLE_BLOCKS, nextBlock)
		nextBlock += step;
    }))
    
    await DB.insert(conn, db, table, {number: Math.max(...missingBlocks, Math.max(lastConcreteBlock, startBlock))})
}

export async function upsyncBlocksFromNode() {
	console.debug("starting block upsyncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
	await DB.checkUpsyncTable(conn, db, TABLE_UPSYNC)
	
	while(true)
	{
        try {
            await upsyncBlocks(conn, db, TABLE_UPSYNC)
        } catch (err) {
            console.debug('Failed:', err.message)
        }
	}
}
