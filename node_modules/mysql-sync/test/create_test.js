eval(require('../lib/require_bundle')('sync', 'common'));


var setup = require('./setup');

setup(co(function*(db, $M) {
    var newUser = yield* $M('users').create({
        'first_name': 'Danny',
        'last_name': 'Tag',
        'gender': 'F',
        'date_of_birth': new Date(),
        'email': ''
    });

    return newUser;
}));
