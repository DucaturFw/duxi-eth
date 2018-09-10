const { web3 } = require('../config')

function pushRawTx(txData) {
    return web3.eth.sendSignedTransaction(txData)
}

module.exports = server => {
    server.route({
        method: 'POST',
        path: '/push_raw_tx',
        handler: async function(req, h) {
            if (req.payload.transaction_hex && req.payload.transaction_hex.indexOf('0x') === 0) {
                console.info(`Pushing raw tx: ${req.payload.transaction_hex}`)
                const res = await pushRawTx(req.payload.transaction_hex)
                return h.response(res).code(201)
            } else {
                return h.response({ error: 'You did not specify valid `transaction_hex` to push to ETH RPC node' }).code(400)
            }
        }
    });
};