eval(require('./require_bundle')('sync', 'common'));


var qoop = require('qoop');
var Util = require('./util');

var Table = function() {
    this._init.apply(this, arguments);
};

Table.prototype = {
    _init: function(cfg) {
        this._name = cfg.name;
        this._db = cfg.db;

        this._qoopTable = new qoop.Table(this._name);
    },

    getName: function() {
        return this._name;
    },

    getIdFieldName: function() {
        return this._db._idFieldName;
    },

    getVersionFieldName: function() {
        return this._db._versionFieldName;
    },

    getCreatedFieldName: function() {
        return this._db._createdFieldName;
    },

    getUpdatedFieldName: function() {
        return this._db._updatedFieldName;
    },

    getSoftDeleteFieldName: function() {
        return this._db._softDeleteFieldName;
    },

    _supportOptimisticLock: function() {
        return this._db._supportOptimisticLock;
    },

    _supportSoftDelete: function() {
        return this._db._supportSoftDelete;
    },

    _getSchema: function() {
        return this._db._schema[this._name];
    },

    _executeQuery: co(function*(q) {
        return (yield* this._db.executeQuery(q));
    }),

    /* create */

    _refineDto: function(dto, autoId) {
        autoId = (autoId === undefined)? true: autoId;
        var res = {};
        
        $U.each(this._getSchema(), function(field) {
            if (dto[field]) {
                res[field] = dto[field];
            }            
        });

        if (autoId) {
            delete res[this.getIdFieldName()];
        }

        return res;
    },

    _refineDtoForCreate: function(dto) {
        var res = this._refineDto(dto);

        var d = new Date();
        res[this.getCreatedFieldName()] = d;
        res[this.getUpdatedFieldName()] = d;
        if (this._supportOptimisticLock()) {
            res[this.getVersionFieldName()] = 0;
        }

        if (this._supportSoftDelete()) {
            res[this.getSoftDeleteFieldName()] = 0;
        }

        return res;
    },

    _create: co(function*(dto) {
        var l = [
            ' insert into ' + this.getName() + ' set '
        ];

        var first = true;

        $U.each(dto, function(v, k) {
            if (first) {
                first = false;
            } else {
                l.push(', ');
            }
            l.push(
                ' ', k, ' = ', mysql.escape(v)
            );
        });

        l.push(' ; ');

        var q = l.join('');

        // console.log(q);

        var res = yield* this._executeQuery(q);
        return res['insertId'];
    }),

    create: co(function*(dto) {
        dto = this._refineDtoForCreate(dto);
        return yield* this._create(dto);
    }),

    clone: co(function*(dto) {
        dto = this._refineDto(dto, false);
        return (yield* this._create(dto));
    }),

    /* update */

    _isUpdatable: function(field) {
        if (field == this.getIdFieldName() ||
            field == this.getCreatedFieldName() ||
            field == this.getUpdatedFieldName()
        ) {
            return false;
        }

        if (this._supportOptimisticLock() && field == this.getVersionFieldName()) {
            return false;
        }

        if (this._supportSoftDelete() && field == this.getSoftDeleteFieldName()) {
            return false;
        }

        return $U.contains(this._getSchema(), field);
    },


    _refineDtoForUpdate: function(dto) {
        var res = {};

        for (var k in dto) {
            if (this._isUpdatable(k)) {
                res[k] = dto[k];
            }
        }

        var d = new Date();
        res[this.getUpdatedFieldName()] = d;

        return res;
    },

    _update: co(function*(id, dto, conditions) {
        var l = [
            ' update ', this.getName(), ' set '
        ];

        var first = true;
        for (var k in dto) {
            var v = dto[k];
            if (first) {
                first = false;
            } else {
                l.push(', ');
            }
            l.push(
                ' ', k, ' = ', mysql.escape(v)
            );
        }

        l.push(
            ' where ', this.getIdFieldName(), ' = ', id
        );

        if (conditions) {
            l.push(
                ' and ', conditions
            );
        }

        l.push(' ; ');

        var q = l.join('');

        // console.log(q);
        var res = yield* this._executeQuery(q);
        return res;
    }),

    update: co(function*(row, dto) {
        var id = row[this.getIdFieldName()];
        dto = this._refineDtoForUpdate(dto);

        var cond;
        if (this._supportOptimisticLock()) {
            var version = row[this.getVersionFieldName()];
            dto[this.getVersionFieldName()] = version + 1;
            cond = Util.format('version = ?', [version]);
        }

        return (yield* this._update(id, dto, cond));
    }),

    /* find */

    find: co(function*(queryBuilder) {
        var t = this._qoopTable;
        var query = new qoop.Query().select(t.all()).from(t);
        if (queryBuilder) {
            queryBuilder(query, t);
        }         

        var res = yield* this._executeQuery(query.toS());
        return res;
    }),

    findOne: co(function*(queryBuilder) {
        var res = yield* this.find(queryBuilder);
        return res[0];
    }),

    findById: co(function*(id) {
        var me = this;

        return (yield* this.findOne(function(q, t) {
            q.where(t.col(me.getIdFieldName()).is('=', id));
        }));
    }),

    findByFields: co(function*(mappings) {
        return (yield* this.find(function(q, t) {
            var cond = $U.reduce($U.values($U.mapObject(mappings, function(value, name){
                return t.col(name).is('=', value);
            })), function(left, right) {
                return left.and(right);
            });
            
            q.where(cond);
        }));
    }),

    lockById: co(function*(id) {
        var t = this._qoopTable;
        var query = new qoop.Query().select(t.all()).from(t);
        query.where(t.col(this.getIdFieldName()).is('=', id));
        var qstr = query.toS();
        qstr = qstr + ' for update ';

        var res = yield* this._executeQuery(qstr);
        return res[0];
    }),
    
    /* delete */

    softDelete: co(function*(id) {
        if (!this._supportSoftDelete()) {
            throw new Error('soft-delete-not-supported');
        }
        var dto = {};
        dto[this.getSoftDeleteFieldName()] = 1;
        return (yield* this._update(dto));
    }),
    
    remove: co(function*(id) {
        var q = ' delete from ' + this.getName() + ' where ' + this.getIdFieldName() + ' = ' + id;

        return (yield* this._executeQuery(q));
    })
};

module.exports = Table;
