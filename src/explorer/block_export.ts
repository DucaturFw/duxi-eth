import r from "rethinkdb"
import * as DB from "./db"
import {web3, RDB_NODE, DB_NAME, TABLE_BLOCKS, BLOCK_STEP, START_BLOCK, VALIDATE_DEPTH, HISTORY_SYNC_MODE} from './config'

const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time))

let toBeFlushed: any[] = []
const setup: any = {}
let timer: any = 0;

async function syncBlock(conn: r.Connection, db: r.Db, table: string, blockNumber: number, recursive: boolean = false, hist: boolean) {
	const block = await web3.eth.getBlock(blockNumber)

	if (hist) {
		toBeFlushed.push(block);
	} else {
		console.info('Syncing: ', block.number)
		await DB.insert(conn, db, table, block);
	}

	if (recursive) {
		let parent = await DB.get(conn, db, table, blockNumber - 1, 'number') || { hash: '' }
		if ((<typeof block>parent).hash !== block.parentHash) {
			await syncBlock(conn, db, table, blockNumber - 1, recursive, hist);
		}
	}
	return block;
}

async function syncBlocks(conn: r.Connection, db: r.Db, table: string, hist: boolean) {
	let blockHeight = await web3.eth.getBlockNumber()
	console.debug(`block height: ${blockHeight}`)
	
	let lastBlock = await DB.getLastSyncedBlock(conn, db, table)
	console.debug(`last synced block: ${lastBlock}`)

	const step = parseInt(BLOCK_STEP)
	const startBlock = parseInt(START_BLOCK)
	let nextBlock = Math.max(Math.ceil((lastBlock - (startBlock % step)) / step) + (startBlock % step), startBlock)
	console.debug(`Sync from block: ${nextBlock}, blocks step: ${step}`)

	console.assert(blockHeight > lastBlock, "chain is fucking unsynced")
	if (blockHeight <= nextBlock) {
		return delay(30000)
	}

	while (nextBlock < blockHeight) {
		await syncBlock(conn, db, table, nextBlock, blockHeight - nextBlock <= VALIDATE_DEPTH, hist)
		nextBlock += step;
	}
}

export async function syncBlocksFromNode() {
	console.debug("starting block syncer")

	const { conn, db } = await DB.connect(RDB_NODE, DB_NAME)
	await DB.checkBlocksTable(conn, db, TABLE_BLOCKS)
	
	let hist = parseInt(HISTORY_SYNC_MODE) > 0;

	if (hist) {
		console.log('History sync mode is ON')
		setup.conn = conn
		setup.db = db
		setup.table = TABLE_BLOCKS
		timer = setInterval(async () => {
			if (toBeFlushed.length > 0) {
				const toGo = toBeFlushed;
				toBeFlushed = [];
				console.info('Syncing batch: ', toGo.map((x: any) => x.number))
				await DB.insert(setup.conn, setup.db, setup.table, toGo, {durability: 'soft'});
			}
		}, 5000)
	}

	while(true)
	{
		await syncBlocks(conn, db, TABLE_BLOCKS, hist)
	}
}
