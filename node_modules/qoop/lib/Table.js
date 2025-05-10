var Class = require('better-js-class');
var mysql = require('mysql');
var Column = require('./Column').Column;
var All = require('./Column').All;

var Base = Class({
    join: function(right) {
        return new Join(this, 'inner join', right);
    },

    leftJoin: function(right) {
        return new Join(this, 'left join', right);
    },

    rightJoin: function(right) {
        return new Join(this, 'right join', right);
    },

    outerJoin: function(right) {
        return new Join(this, 'outer join', right);
    },

    leftOuterJoin: function(right) {
        return new Join(this, 'left outer join', right);
    },

    rightOuterJoin: function(right) {
        return new Join(this, 'right outer join', right);
    }
});

var Table = Class(Base, {
    _init: function(name) {
        this._name = name;
        this.__isTable__ = true;
    },

    as: function(alias) {
        this._alias = alias;
        return this;
    },

    where: function(condition) {
        if (!this._condition) {
            this._condition = condition;
        } else {
            this._condition = this._condition.and(condition);
        }

        return this;
    },

    getAlias: function() {
        if (this._alias) {
            return this._alias;
        } else {
            return this._name;
        }
    },

    col: function(name) {
        return new Column(this, name);
    },

    all: function() {
        return new All(this);
    },

    toS: function() {
        var l = [
            mysql.escapeId(this._name)
        ];
        if (this._alias) {
            l.push(
                ' as ',
                this._alias
            );
        }
        return l.join('');
    }
});

var Join = Class(Base, {
    _init: function(left, join, right) {
        this._left = left;
        this._right = right;
        this._join = join;
        this.__isJoin__ = true;

        if (this._left._condition) {
            this._condition = this._left._condition;
        }

        if (this._right._condition) {
            this._joinCondition = this._right._condition;
        }
    },

    on: function(cond) {
        if (this._joinCondition) {
            this._joinCondition = this._joinCondition.and(cond);
        } else {
            this._joinCondition = cond;
        }
        return this;
    },

    _conditionToS: function() {
        return this._joinCondition.normalize().toS();
    },

    toS: function() {
        var l = [];

        l.push(this._left.toS(), this._join, this._right.toS(), 'on', this._conditionToS());

        return '(' + l.join(' ') + ')';
    }
});

module.exports = Table;