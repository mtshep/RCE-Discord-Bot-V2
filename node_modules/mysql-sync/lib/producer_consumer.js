var Queue = function() {
    this._init.apply(this, arguments);
};

Queue.prototype = {
    _init: function() {
        this._buffer = [];
    },

    isEmpty: function() {
        return this._buffer.length == 0;
    },
    isFull: function() {
        return this._buffer.length == this._bufferSize - 1;
    },
    enque: function(e) {
        this._buffer.push(e);
    },
    deque: function() {
        return this._buffer.shift();
    },
    each: function(fn) {
        for (var i = 0; i < this._buffer.length; i++) {
            fn(this._buffer[i]);
        }
    }
};

var ProducerConsumer = function(cfg) {
    this._init.apply(this, arguments);
};

ProducerConsumer.prototype = {
    _init: function(cfg) {
        this._bufferSize = cfg['bufferSize'];
        this._buffer = new Queue();
        this._enqueJobs = new Queue();
        this._dequeJobs = new Queue();
    },

    enque: function(e, cb) {
        if (this._buffer.isFull()) {
            this._enqueJobs.enque({e: e, cb: cb});
        } else {
            this._buffer.enque(e);
            cb();
            this._runDequeJobs();
        }
    },

    _runDequeJobs: function() {
        while(!this._buffer.isEmpty() && !this._dequeJobs.isEmpty()) {
            var e = this._buffer.deque();
            var cb = this._dequeJobs.deque();
            cb(null, e);
        }
    },

    deque: function(cb) {
        if (this._buffer.isEmpty()) {
            this._dequeJobs.enque(cb);
        } else {
            var e = this._buffer.deque();
            cb(null, e);
            this._runEnqueJobs();
        }
    },

    _runEnqueJobs: function() {
        while(!this._buffer.isFull() && !this._enqueJobs.isEmpty()) {
            var o = this._enqueJobs.deque();
            this._buffer.enque(o['e']);
            o['cb']();
        }
    },

    end: function(err, res) {
        this._enqueJobs.each(function(job) {
            job['cb'](err, res);
        });
        this._dequeJobs.each(function(job) {
            job(err, res);
        });
    }
};

module.exports = ProducerConsumer;