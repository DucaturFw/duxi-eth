import { NODE, DB_NAME, TABLE_BLOCKS, TABLE_TXS, TABLE_TX_RECEIPTS, TABLE_TRANSFERS, TABLE_CONTRACTS } from '../src/explorer/config';
import { connect, checkBlocksTable, checkTxsTable, checkTxReceiptsTable, checkTransfersTable, checkContractsTable } from '../src/explorer/db';

;(async () => {
    const { conn, db } = await connect(NODE, DB_NAME);
    await checkBlocksTable(conn, db, TABLE_BLOCKS);
    await checkTxsTable(conn, db, TABLE_TXS);
    await checkTxReceiptsTable(conn, db, TABLE_TX_RECEIPTS);
    await checkTransfersTable(conn, db, TABLE_TRANSFERS);
    await checkContractsTable(conn, db, TABLE_CONTRACTS);
})()