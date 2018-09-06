import Web3 from 'web3'

require('dotenv').config()

export const NODE = process.env.DUXI_ETH_NODE || ""
export const RDB_NODE = process.env.DUXI_RETHINKDB_NODE || ""
export const TABLE_BLOCKS = "eth_blocks"
export const TABLE_TXS = "eth_txs"
export const TABLE_TX_RECEIPTS = "eth_tx_receipts"
export const DB_NAME = process.env.DUXI_ETH_DB_NAME || ""

console.assert(NODE, "please provide $DUXI_ETH_NODE!")
console.assert(RDB_NODE, "please provide $DUXI_RETHINKDB_NODE!")
console.assert(DB_NAME, "please provide $DUXI_ETH_DB_NAME!")

export const web3 = new Web3(new Web3.providers.HttpProvider(NODE));