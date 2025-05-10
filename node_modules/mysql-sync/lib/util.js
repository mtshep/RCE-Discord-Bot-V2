var mysql = require('mysql');

var format = function(str, bindings) {
    var l = str.split('?');

    if (l.length - 1 != bindings.length) {
        throw new Error('sql string format error');
    }

    var res = [];

    for (var i = 0; i < bindings.length; i++) {
        res.push(l[i]);
        res.push(mysql.escape(bindings[i]));
    }

    res.push(l[l.length - 1]);

    return res.join(' ');
};

module.exports = {
    'format': format
};
