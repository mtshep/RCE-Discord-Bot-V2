var Class = require('better-js-class');

var Group = Class({
    _init: function(column) {
        this._column = column;
    },

    having: function(cond) {
        this._cond = cond;
    },

    toS:function() {
        var l = [];
        l.push('group by', this._column.toS());
        if (this._cond) {
            l.push('having', this._cond.toS());
        }
        return l.join(' ');
    }
});

module.exports = Group;