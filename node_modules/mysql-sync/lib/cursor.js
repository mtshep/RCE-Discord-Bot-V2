var ProducerConsumer = require('./producer_consumer');

var Cursor = function(conn, q) {
    this._init.apply(this, arguments);
};

Cursor.prototype = {
    _init: function(conn, q) {
        var me = this;

        me._state = 'start';
        me._error = null;
        me._producerConsumer = new ProducerConsumer({bufferSize: 100});

        var query = conn.query(q);
        query
            .on('error', function(err) {
                // console.log('cursor error');
                me._errorOut(err);
            })
            .on('result', function(res) {
                // console.log('cursor result');
                me._state = 'result';
                conn.pause();
                me._producerConsumer.enque(res, function(err) {
                    if (err) {
                        me._errorOut(err);
                    } else {
                        conn.resume();
                    }
                });
            })
            .on('end', function() {
                // console.log('cursor end');
                me._end();
            })
        ;
    },

    _errorOut: function(err) {
        me._state = 'error';
        me._error = err;
        me._producerConsumer.end(err);
    },

    _end: function() {
        me._state = 'end';
        me._producerConsumer.end();
    },

    next: function(cb) {
        switch (this._state) {
            case 'start':
            case 'result':
                this._producerConsumer.deque(cb);
                break;
            case 'error':
                cb(this._error);
                break;
            case 'end':
                cb();
                break;
            default:
                throw new Error('Cursor state undefined: ' + this._state);
        }
    },
};

module.exports = Cursor;