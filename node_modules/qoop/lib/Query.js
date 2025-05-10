var $U = require('underscore');
var Class = require('better-js-class');

var Order = require('./Order');
var Cursor = require('./Cursor');
var Group = require('./Group');
var Condition = require('./Condition');

var empty = function(s) {
    return s == null || s == '';
};

var Query = Class({
    _init: function() {
        this._columns = [];
        this._tables = [];
        this._orders = [];
    },

    select: function() {
        for (var i = 0; i < arguments.length; i++) {
            this._columns.push(arguments[i]);
        }
        return this;
    },

    from: function() {
        for (var i = 0; i < arguments.length; i++) {
            this._tables.push(arguments[i]);
        }
        return this;
    },

    where: function(cond) {
        if (!this._cond) {
            this._cond = cond;
        } else {
            this._cond = this._cond.and(cond);
        }

        return this;
    },

    _columnsToS: function() {
        var l = [];

        $U.each(this._columns, function(column) {
            l.push(column.toS());
        });

        return l.join(', ');
    },

    _tablesToS: function() {
        var l = [];

        $U.each(this._tables, function(table) {
            l.push(table.toS());
        });

        return l.join(', ');
    },

    _conditionToS: function() {
        var cond = this._cond;
        $U.each(this._tables, function(table) {
            if (table._condition) {
                cond = cond.and(table._condition);
            }
        });

        return cond.normalize().toS();
    },

    asc: function(column) {
        this._orders.push(new Order(column, 'asc'));
        return this;
    },

    desc: function(column) {
        this._orders.push(new Order(column, 'desc'));
        return this;
    },

    _ordersToS: function() {
        if (this._orders.length == 0) {
            return '';
        } else {
            var l = [];

            $U.each(this._orders, function(order) {
                l.push(order.toS());
            });

            return l.join(', ');
        }
    },

    limit: function(limit) {
        this._cursor = new Cursor(limit);
        return this;
    },

    offset: function(offset) {
        if (this._cursor) {
            this._cursor.offset(offset);
        }
        return this;
    },

    group: function(column) {
        this._group = new Group(column);
        return this;
    },

    having: function(cond) {
        if (this._group) {
            this._group.having(cond);
        }
        return this;
    },

    union: function(other) {
        return new Union([this, other]);
    },

    as: function(alias) {
        return new QueryAsTable(this, alias);
    },

    exists: function() {
        return new Condition.Exists(this);
    },

    toS: function() {
        var l = [];

        l.push('select');
        l.push(this._columnsToS());
        l.push('from');
        l.push(this._tablesToS());

        var condition = this._conditionToS();
        if (!empty(condition)) {
            l.push('where', condition);
        }

        if (this._group) {
            var group = this._group.toS();
            if (!empty(group)) {
                l.push(group);
            }
        }

        var order = this._ordersToS();
        if (!empty(order)) {
            l.push('order by', order);
        }

        if (this._cursor) {
            var cursor = this._cursor.toS();
            if (!empty(cursor)) {
                l.push(cursor);
            }
        }

        return l.join(' ');
    }
});

var Union = Class({
    _init: function(queries) {
        this._queries = queries;
    },

    toS: function() {
        var l = [];

        $U.each(this._queries, function(query) {
            l.push(query.toS());
        });

        return l.join(' union ');
    }
});

var QueryAsTable = Class({
    _init: function(query, alias) {
        this._query = query;
        this._alias = alias;
    },

    toS: function() {
        var l = [];
        l.push('(', this._query.toS(), ') as ', this._alias);
        return l.join('');
    }
});

module.exports = Query;

