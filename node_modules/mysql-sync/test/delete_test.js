eval(require('../lib/require_bundle')('sync', 'common'));

var setup = require('./setup');

setup(co(function*(db, $M) {
    return yield* $M('users').remove(3);
}));
