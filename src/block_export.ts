import r from "rethinkdb"
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_BLOCKS} from './config'

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
	console.log(`last block: ${lastBlock}`)

	console.assert(blockHeight > lastBlock, "chain is fucking unsynced")
	if (blockHeight == lastBlock + 1) {
		return delay(30000)
	}

	lastBlock += 1;
	while (lastBlock < blockHeight) {
		let currBlock = await syncBlock(conn, db, table, lastBlock)
		// for later blocks verify parent
		if (blockHeight - lastBlock >= 15) {
			let parent = await DB.get(conn, db, table, lastBlock - 1) || { hash: '' }
			if ((<typeof currBlock>parent).hash !== currBlock.parentHash) {
				await syncBlock(conn, db, table, lastBlock - 1);
			}
		}
		lastBlock += 1;
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
