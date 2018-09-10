const Web3 = require('web3')

const PUBLIC_ETH_NODES = [""]
const NODE = process.env.DUXI_ETH_NODE || PUBLIC_ETH_NODES[Math.floor(Math.random() * PUBLIC_ETH_NODES.length)];
console.assert(NODE, "please provide $DUXI_ETH_NODE!")

const DEFAULT_ADDRESS = '0.0.0.0';
const DEFAULT_PORT = 3100;
const DEFAULT_DEV_PORT = 3200;

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        return val;
    }

    if (port >= 0) {
        return port;
    }

    return false;
}

const web3 = new Web3(new Web3.providers.HttpProvider(NODE));

module.exports = {
    port: normalizePort(process.env.PORT || DEFAULT_PORT),
    address: process.env.ADDRESS || DEFAULT_ADDRESS,
    devPort: DEFAULT_DEV_PORT,
    web3
};