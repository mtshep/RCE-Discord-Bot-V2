var Class = require('better-js-class');


var Order = Class({
    _init: function(column, direction) {
        this._column = column;

        switch(direction) {
            case 'asc':
            case 'desc':
                this._direction = direction;
                break;
            default:
                throw new Error('Unsupported direction: ' + direction);
        }
    },

    toS: function() {
        var l = [];

        l.push(this._column.toS());
        l.push(this._direction);

        return l.join(' ');
    }
});

module.exports = Order;