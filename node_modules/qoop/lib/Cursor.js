var Class = require('better-js-class');

var Cursor = Class({
    _init: function(limit) {
        this._limit = limit;
    },

    offset: function(offset) {
        this._offset = offset;
    },

    toS: function() {
        var l = [];
        l.push('limit', this._limit);
        if (this._offset != null) {
            l.push('offset', this._offset);
        }
        return l.join(' ');
    }
});

module.exports = Cursor;