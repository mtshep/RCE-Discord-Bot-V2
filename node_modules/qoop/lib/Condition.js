var Class = require('better-js-class');
var $U = require('underscore');
var mysql = require('mysql');

var otherToS = function(other) {
    if (other.__isColumn__ || other.__isModifier__) {
        return other.toS();
    } else {
        return mysql.escape(other);
    }
};

var Cond = Class({
    and: function(cond) {
        return new And([this, cond]);
    },

    or: function(cond) {
        return new Or([this, cond]);
    },

    not: function() {
        return new Not(this);
    },

    normalize: function() {
        return this;
    }
});

var IsNull = Class(Cond, {
    _init: function(column) {
        this._column = column;
    },

    toS: function() {
        return [
            this._column.toS(), ' is null'
        ].join('');
    }
});

var IsNotNull = Class(Cond, {
    _init: function(column) {
        this._column = column;
    },

    toS: function() {
        return [
            this._column.toS(), ' is not null'
        ].join('');
    }
});

var IsTrue = Class(Cond, {
    _init: function(column) {
        this._column = column;
    },

    toS: function() {
        return [
            this._column.toS(), ' is true'
        ].join('');
    }
});

var IsFalse = Class(Cond, {
    _init: function(column) {
        this._column = column;
    },

    toS: function() {
        return [
            this._column.toS(), ' is false'
        ].join('');
    }
});

var Is = Class(Cond, {
    _init: function(column, op, other) {
        this._column = column;
        this._other = other;
        this._op = op;
    },

    toS: function() {
        var l = [
            this._column.toS(),
            ' ', this._op, ' ',
            otherToS(this._other)
        ];

        return l.join('');
    }
});

var IsIn = Class(Cond, {
    _init: function(column, other) {
        this._column = column;
        this._other = other;
    },

    toS: function() {
        var l = [
            this._column.toS(),
            ' in (',
            otherToS(this._other),
            ')'
        ];

        return l.join('');
    }
});

var And = Class(Cond, {
    _init: function(conditions) {
        this.__isAnd__ = true;
        this._conditions = conditions;
    },

    toS: function() {
        var l = [];

        $U.each(this._conditions, function(condition) {
            l.push(condition.toS());
        });

        return '(' + l.join(' and ') + ')';
    },

    normalize: function() {
        var normalizedList = [];

        $U.each(this._conditions, function(condition) {
            normalizedList.push(condition.normalize());
        });

        var flattened = [];
        $U.each(normalizedList, function(condition) {
            if (condition.__isAnd__) {
                flattened= flattened.concat(condition._conditions);
            } else {
                flattened.push(condition);
            }
        });

        return new And(flattened);
    }
});

var Or = Class(Cond, {
    _init: function (conditions) {
        this.__isOr__ = true;
        this._conditions = conditions;
    },

    toS: function () {
        var l = [];

        $U.each(this._conditions, function (condition) {
            l.push(condition.toS());
        });

        return '(' + l.join(' or ') + ')';
    },

    normalize: function () {
        var normalizedList = [];

        $U.each(this._conditions, function(condition) {
            normalizedList.push(condition.normalize());
        });

        var flattened = [];
        $U.each(normalizedList, function(condition) {
            if (condition.__isOr__) {
                flattened= flattened.concat(condition._conditions);
            } else {
                flattened.push(condition);
            }
        });

        return new Or(flattened);
    }
});

var Not = Class(Cond, {
    _init: function(condition) {
        this.__isNot__ = true;
        this._condition = condition;
    },

    toS: function() {
        var l = [];

        l.push('not (', this._condition.toS(), ')');

        return l.join('');
    },

    normalize: function() {
        var normalizedCondition = this._condition.normalize();

        if (normalizedCondition.__isNot__) {
            return normalizedCondition;
        } else {
            return this;
        }
    }
});

var Exists = Class(Cond, {
    _init: function(query) {
        this._query = query;
    },

    toS: function() {
        var l = [];

        l.push('exists (', this._query.toS(), ')');

        return l.join('');
    }
});

var Raw = Class(Cond, {
    _init: function(s) {
        this._s = s;
    },

    toS: function() {
        return this._s;
    }
});

module.exports = {
    IsNull: IsNull,
    IsNotNull: IsNotNull,
    IsTrue: IsTrue,
    IsFalse: IsFalse,
    Is: Is,
    IsIn: IsIn,
    And: And,
    Or: Or,
    Not: Not,
    Exists: Exists,
    Raw: Raw,
    'and': function() {
        return new And($U.toArray(arguments));
    },
    'or': function() {
        return new Or($U.toArray(arguments));
    }
};