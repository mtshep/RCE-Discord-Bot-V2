eval(require('../lib/require_bundle')('sync', 'common'));

var setup = require('./setup');

setup(co(function*(db, $M) {
    return (yield* $M('users').update({'id': 2}, {
        'first_name': 'Micky'
    }));
}));
