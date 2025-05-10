/*
var sync = require('node-sync').sync5;
var co = sync.co;
var proc = sync.proc;
var $let = sync.$let;
var $get = sync.$get;
var lift = sync.lift;
*/

eval(require('./require_bundle')('sync', 'common'));

var Util = require('./util');



var DB = function() {
    this._init.apply(this, arguments);
};

DB.prototype = {
    _init: function(cfg) {
        this._db = cfg['db'];

        var poolConfig = $U.extend(this._db._connection, cfg['connection']);
        this._pool = mysql.createPool(poolConfig);

        this._txnKey = 'txn_key_' + uuid.v4();
    },

    _inTransaction: co(function*() {
        var me = this;

        var txnConn = yield* $get(me._txnKey);
        return txnConn != null;
    }),

    _getConnection: co(function*() {
        var me = this;

        var txnConn = yield* $get(me._txnKey);
        if (txnConn) {
            return txnConn;
        }
        return (yield* lift(me._pool.getConnection, me._pool)());
    }),

    executeQuery: co(function*(q) {
        var me = this;

        var conn = yield* $get(me._txnKey);
        if (conn) {
            return (yield* lift(conn.query, conn)(q));
        } else {
            try {
                conn = yield* lift(me._pool.getConnection, me._pool)();
                return (yield* lift(conn.query, conn)(q));
            } finally {
                conn.release();
            }
        }
    }),

    transaction: co(function*(gfn) {
        var me = this;

        var txnConn = yield* $get(me._txnKey);
        if (txnConn) {
            return yield* gfn();
        }

        console.log('new txn conn');

        txnConn = yield* lift(me._pool.getConnection, me._pool)();

        var _executeTransaction = co(function*() {
            try {
                yield* lift(txnConn.query, txnConn)('start transaction');
                var env = {};
                env[me._txnKey] = txnConn;
                var res = yield* $let(env, gfn)();
                yield* lift(txnConn.query, txnConn)('commit');
                return res;
            } catch(e) {
                yield* lift(txnConn.query, txnConn)('rollback');
                throw e;
            } finally {
                txnConn.release();
            }
        });

        return yield* $let({[me._txnKey]: txnConn}, _executeTransaction)();
    }),

    context: co(function*(gfn) {
        var env = {};
        env[this._db._dbKey] = this;

        var res = yield* $let(env, gfn)();
        return res;
    }),

    cursor: co(function*(q, gfn) {
        var me = this;

        try {
            var conn = yield* lift(me._pool.getConnection, me._pool)();

            var cursor = new Cursor(conn, q);

            while (true) {
                var row = yield* lift(cursor.next, cursor)();
                if (!row) {
                    break;
                } else {
                    yield* gfn(row);
                }
            }
        } finally {
            conn.release();
        }
    }),

    end: function() {
        this._pool.end();
    }
};


module.exports = DB;
