const IO = require('socket.io');
const r = require('rethinkdb');

const conn = r.connect('localhost')

function blocksPusher(listener, path, db = 'duxi_eth', table = 'eth_blocks') {
    const io = IO(listener, { path });
    io.on('connection', function(socket) {
        const changes = r.db(db).table(table).changes().map(x => x('new_val')).run(conn)
        changes.each(change => socket.send('update', change))

        socket.on('disconnect', () => { delete changes })
    });
}

function txsPusher(listener, path, db = 'duxi_eth', table = 'eth_txs') {
    const io = IO(listener, { path });
    // middleware
    io.use((socket, next) => {
        let addr = socket.handshake.query.address;
        if (addr && addr.length == 66 && addr.indexOf('0x') === 0) {
            return next();
        }
        return next(new Error('authentication error'));
    });
    io.on('connection', function(socket) {
        const addr = socket.handshake.query.address;
        const changes = r.db(db).table(table).changes().map(x => x('new_val')).filter(r.row("from").eq(addr).or(r.row("to").eq(addr))).run(conn)
        changes.each(change => socket.send('update', change))

        socket.on('disconnect', () => { delete changes })
    });
}

module.exports = server => {
    blocksPusher(server.listener, '/ws/blocks')
    txsPusher(server.listener, '/ws/txs')
};