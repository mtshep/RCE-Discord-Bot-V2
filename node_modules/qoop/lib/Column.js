var Class = require('better-js-class');
var mysql = require('mysql');
var Condition = require('./Condition');

var All = Class({
    _init: function(table, column) {
        this._table = table;
        this._column = column;
        this.__isColumn__ = true;
    },

    toS: function() {
        var l = [this._table.getAlias(), '.*'];
        return l.join('');
    }
});

var ColumnAlias = Class({
    _init: function(column, alias) {
        this._column = column;
        this._alias = alias;
    },

    toS: function() {
        var l = [];
        l.push(this._column.toS(), 'as', this._alias);
        return l.join(' ');
    }
});

var Modifier = Class({
    _init: function(column, modifier) {
        this._column = column;
        this._modifier = modifier;
        this.__isModifier__ = true;
    },

    toS: function() {
        var l = [];

        l.push(this._modifier, '(', this._column.toS(), ')');

        return l.join('');
    },

    as: function(alias) {
        return new ColumnAlias(this, alias);
    },

    is: function(op, other) {
        return new Condition.Is(this, op, other);
    }
});

var Column = Class({
    _init: function(table, column) {
        this._table = table;
        this._column = column;
        this.__isColumn__ = true;
    },

    as: function(alias) {
        return new ColumnAlias(this, alias);
    },

    toS: function() {
        var l = [
            this._table.getAlias(),
            '.',
            mysql.escapeId(this._column)
        ];
        return l.join('');
    },

    isNull: function() {
        return new Condition.IsNull(this);
    },

    isNotNull: function() {
        return new Condition.IsNotNull(this);
    },

    isTrue: function() {
        return new Condition.IsTrue(this);
    },

    isFalse: function() {
        return new Condition.IsFalse(this);
    },

    is: function(op, other) {
        if (other == null) {
            throw new Error('Right hand side expression of "is" must not be null');
        }
        return new Condition.Is(this, op, other);
    },

    isIn: function(other) {
        if (other == null) {
            throw new Error('Parameter of "isIn" must not be null');
        }

        return new Condition.IsIn(this, other);
    },

    count: function() {
        return new Modifier(this, 'count');
    },

    distinct: function() {
        return new Modifier(this, 'distinct');
    },

    min: function() {
        return new Modifier(this, 'min');
    },

    max: function() {
        return new Modifier(this, 'max');
    },

    sum: function() {
        return new Modifier(this, 'sum');
    }
});

module.exports = {
    Column: Column,
    All: All
};