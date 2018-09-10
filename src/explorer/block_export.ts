import r from "rethinkdb"
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_BLOCKS, BLOCK_STEP, START_BLOCK, VALIDATE_DEPTH} from './config'

const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time))

async function syncBlock(conn: r.Connection, db: r.Db, table: string, blockNumber: number) {
	const block = await web3.eth.getBlock(blockNumber)
	console.info('Syncing: ', block.number)
	await DB.insert(conn, db, table, block);
	return block;
}

async function syncBlocks(conn: r.Connection, db: r.Db, table: string) {
	let blockHeight = await web3.eth.getBlockNumber()
	console.debug(`block height: ${blockHeight}`)
	let lastBlock = await DB.getLastSyncedBlock(conn, db, table)
	let step = parseInt(BLOCK_STEP)
	let nextBlock = Math.max(lastBlock + 1, parseInt(START_BLOCK))
	console.debug(`Sync from block: ${nextBlock}, blocks step: ${step}`)

	console.assert(blockHeight > lastBlock, "chain is fucking unsynced")
	if (blockHeight <= nextBlock) {
		return delay(30000)
	}

	while (nextBlock < blockHeight) {
		let currBlock = await syncBlock(conn, db, table, nextBlock)
		// for later blocks verify parent
		if (blockHeight - nextBlock <= VALIDATE_DEPTH) {
			let parent = await DB.get(conn, db, table, nextBlock - 1, 'number') || { hash: '' }
			if ((<typeof currBlock>parent).hash !== currBlock.parentHash) {
				await syncBlock(conn, db, table, nextBlock - 1);
			}
		}
		nextBlock += step;
	}
}

export async function syncBlocksFromNode() {
	console.debug("starting block syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
	await DB.checkBlocksTable(conn, db, TABLE_BLOCKS)
	
	while(true)
	{
		await syncBlocks(conn, db, TABLE_BLOCKS)
	}
}
