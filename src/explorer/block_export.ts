import r from "rethinkdb"
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_BLOCKS, BLOCK_STEP, START_BLOCK, VALIDATE_DEPTH} from './config'

const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time))

async function syncBlock(conn: r.Connection, db: r.Db, table: string, blockNumber: number) {
	const block = await web3.eth.getBlock(blockNumber)
	console.log('Syncing: ', block.number)
	await DB.insert(conn, db, table, block);
	return block;
}

async function syncBlocks(conn: r.Connection, db: r.Db, table: string) {
	let blockHeight = await web3.eth.getBlockNumber()
	console.log(`block height: ${blockHeight}`)
	let lastBlock = await DB.getLastSyncedBlock(conn, db, table)
	lastBlock = Math.max(lastBlock, parseInt(START_BLOCK))
	let step = parseInt(BLOCK_STEP)
	console.log(`last block: ${lastBlock}, blocks step: ${step}`)

	console.assert(blockHeight > lastBlock, "chain is fucking unsynced")
	if (blockHeight <= lastBlock + step) {
		return delay(30000)
	}

	lastBlock += step;
	while (lastBlock < blockHeight) {
		let currBlock = await syncBlock(conn, db, table, lastBlock)
		// for later blocks verify parent
		if (blockHeight - lastBlock <= VALIDATE_DEPTH) {
			let parent = await DB.get(conn, db, table, lastBlock - 1, 'number') || { hash: '' }
			if ((<typeof currBlock>parent).hash !== currBlock.parentHash) {
				await syncBlock(conn, db, table, lastBlock - 1);
			}
		}
		lastBlock += step;
	}
}

export async function syncBlocksFromNode() {
	console.log("starting block syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
	await DB.checkBlocksTable(conn, db, TABLE_BLOCKS)
	
	while(true)
	{
		await syncBlocks(conn, db, TABLE_BLOCKS)
	}
}
