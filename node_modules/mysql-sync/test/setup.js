eval(require('../lib/require_bundle')('sync', 'common'));

var DBCfg = require('../lib/db_config');

var setup = function(main) {
    var cfg = {
        host     : 'localhost',
        user     : 'root',
        password : 'root',
        database : 'chat'
    };

    var dbCfg;
    var $M;

    var prepare = co(function*() {
        dbCfg = new DBCfg({
            'supportSoftDelete': true,
            'supportOptimisticLock': false,
            'connection': cfg
        });

        yield* dbCfg.ready();
        var db = dbCfg.getDB({
            'connectionLimit': 10
        });
        $M = function(name) {return dbCfg.getModel(name);};
        return db;
    });

    var run = co(function*() {
        try {
            var db = yield* prepare();
            return (yield* db.context(co(function*() {
                return yield* main(dbCfg, $M);
            })));
        } catch(err) {
            console.log(err);
            throw err;
        }finally {
            db.end();
        }
    });

    proc(run)()({}, function(err, res) {
        if (err) {
            console.log('Error:', err);
            if (err.stack) {
                console.log(err.stack);
            }
            if (err.__generatorStack__) {
                console.log(err.__generatorStack__);
            }
        } else {
            console.log('Ok:', res);
        }
    });
};

module.exports = setup;

