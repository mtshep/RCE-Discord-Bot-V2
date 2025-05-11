eval(require('./require_bundle')('sync', 'common'));

var Table = require('./table');
var DB = require('./db');
var Util = require('./util');


var getValue = function(o) {
    for (var k in o) {
        return o[k];
    }
};

var DBConfig = function() {
    this._init.apply(this, arguments);
};

DBConfig.prototype = {
    _init: function(cfg) {
        this._name = cfg.name;
        this._idFieldName = cfg.idFieldName || 'id';
        this._createdFieldName = cfg.createdFieldName || 'date_created';
        this._updatedFieldName = cfg.updatedFieldName || 'last_updated';

        this._versionFieldName = cfg.versionFieldName || 'lock_version';
        this._softDeleteFieldName = cfg['softDeleteFieldName'] || 'is_deleted';

        this._supportOptimisticLock = cfg['supportOptimisticLock'] === undefined ? true: cfg['supportOptimisticLock'];
        this._supportSoftDelete = cfg['supportSoftDelete'] === undefined ? true: cfg['supportSoftDelete'];

        this._connection = cfg['connection'];
        this._connection['connectionLimit'] = 1;

        this._schema = {};
        this._prepared = false;

        this._models = {};
        this._dbKey = 'db_key_' + uuid.v4();
    },

    each: co(function*(list, gfn) {
    	for (var i = 0; i < list.length; i++) {
    		yield* gfn(list[i]);
    	}
    }),

    _prepareModels: function() {
        var me = this;

        $U.each($U.keys(me._schema), function(name) {
            me._models[name] = new Table({
                name: name,
                db: me
            });
        });
    },

    getModel: function(name) {
        return this._models[name];
    },

    getDB: function(cfg) {
        return new DB({
            'db': this,
            'connection': cfg
        });
    },

    executeQuery: co(function*(q) {
        var db = yield* $get(this._dbKey);
        if (!db) {
            throw new Error('no-connection-pool');
        }
        if (db._db != this) {
            throw new Error('mismatch-db-context');
        }
        return (yield* db.executeQuery(q));
    }),

    transaction: co(function*(gfn) {
        var db = yield* $get(this._dbKey);
        if (!db) {
            throw new Error('no-connection-pool');
        }
        if (db._db != this) {
            throw new Error('mismatch-db-context');
        }
        return (yield* db.transaction(gfn));
    }),

    format: Util.format,

    ready: co(function*() {
        var me = this;

        if (this._prepared) {
            return;
        }        

        try {
        	var pool = mysql.createPool(me._connection);
            var conn = yield* lift(pool.getConnection, pool)();

            var tables = yield* lift(conn.query, conn)('show tables');

            yield* me.each(tables, co(function*(table) {
                var tableName = getValue(table);
                var columns = yield* lift(conn.query, conn)('desc ' + tableName);
                me._schema[tableName] = $U.map(columns, function(column) {
                    return column['Field'];
                });
            }));
            me._prepareModels();
            me._prepared = true;
        } catch(err) {
            console.log(err);
            throw err;
        } finally {
            conn.release();
            pool.end();
        }
    })
};

module.exports = DBConfig;


