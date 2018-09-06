# Ducatur XI Ethereum grabber

## Project overview

### Env settings

#### DUXI_ETH_NODE - ETH public node RPC provider address

#### DUXI_RETHINKDB_NODE - RethinkDB node address

#### DUXI_ETH_DB_NAME - RethinkDB ETH database name

### Pipeline

1. Get block data from public ETH node by `src/block_export` to RethinkDB.
2. Get block's transactions data by `src/tx_export` by pub/sub and web3.
3. Get transaction's receipt data by `src/tx_receipt_export` by pub/sub and web3.

## Setup and run

    yarn
    docker-compose up -d # run rethinkdb
    yarn start-all       # buggy
