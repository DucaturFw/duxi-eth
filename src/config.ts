import Web3 from 'web3'

require('dotenv').config()

const PUBLIC_ETH_NODES = [""]

export const NODE = process.env.DUXI_ETH_NODE || PUBLIC_ETH_NODES[Math.floor(Math.random() * PUBLIC_ETH_NODES.length)];
export const RDB_NODE = process.env.DUXI_RETHINKDB_NODE || ""
export const DB_NAME = process.env.DUXI_ETH_DB_NAME || ""
export const TABLE_BLOCKS = "eth_blocks"
export const TABLE_TXS = "eth_txs"
export const TABLE_TX_RECEIPTS = "eth_tx_receipts"
export const TABLE_CONTRACTS = "eth_contracts" // list of known contracts addresses
export const TABLE_TRANSFERS = "eth_transfers" // ETH, ERC20, ERC223
export const TABLE_ADDR_STATE = "eth_states" // token stakes for address (wallet behaviour?)
export const TABLE_ABIS = "eth_abis" // list of known signatures and abis

console.assert(NODE, "please provide $DUXI_ETH_NODE!")
console.assert(RDB_NODE, "please provide $DUXI_RETHINKDB_NODE!")
console.assert(DB_NAME, "please provide $DUXI_ETH_DB_NAME!")

export const web3 = new Web3(new Web3.providers.HttpProvider(NODE));