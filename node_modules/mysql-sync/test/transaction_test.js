eval(require('../lib/require_bundle')('sync', 'common'));

var setup = require('./setup');

setup(co(function*(db, $M) {
    var User = $M('users');

    var update = co(function*(time, s) {
        return yield* db.transaction(co(function*() {
            console.log('here1', s);
            var row = yield* User.lockById(2);
            console.log('here2', s);
            yield* sleep(time);
            console.log('here3', s);
            if (row) {
                var newEmail = row['email'] || '';
                newEmail = newEmail + s;
                yield* User.update(row, {
                    'email': newEmail
                });
                console.log('here4', s);
            }
        }));
    });

    var txn = co(function*() {
        yield* User.update({id: 2}, {email: 'foobar'});

        var thread1 = yield* Thread.fork(co(function*() {
            return yield* update(2000, 'aaa');
        }));

        var thread2 = yield* Thread.fork(co(function*() {
            return yield* update(1000, 'bbb');
        }));

        var res1 = yield* thread1.join();
        var res2 = yield* thread2.join();

        return [res1, res2];
    });

    return yield* txn();
}));
