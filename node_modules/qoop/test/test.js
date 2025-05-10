Error.stackTraceLimit = Infinity;

var Class = require('better-js-class');
var mysql = require('mysql');

var qoop = require('../lib/qoop');
var Query = qoop.Query;
var Table = qoop.Table;

(function() {

    var co = new Table('collections').as('co');
    co.where(co.col('deleted').isNull());

    var u = new Table('user_profiles').as('u');
    u.where(u.col('deleted').isNull());

    var c = new Table('clips').as('c');
    c.where(c.col('deleted').isNull());

    var i = new Table('items').as('i');
    i.where(i.col('deleted').isNull());

    var cv = new Table('collection_votes').as('cv');
    cv.where(cv.col('deleted').isNull());

    /*
     var q = db.format([
     'select c.*, u.user_info as user_info, co.title as collection_title, i.asset_info as asset_info, i.id as original_item_id, i.clip_count as clip_count',
     'from items i, clips c, collections co, user_profiles u',
     'where i.id in (?)',
     'and i.representative_clip_id = c.id',
     'and c.representative_collection_id = co.id',
     'and c.user_profile_id = u.id',
     'and u.deleted is not true'
     ].join(' '), [ids]);
     */
    /*
    q.select(
        c.all(),
        u.col('user_info').as('user_info'),
        co.col('title').as('collection_title'),
        i.col('asset_info').as('asset_info'),
        i.col('id').as('original_item_id'),
        i.col('clip_count').as('clip_count')
    ).from(
        c, u, co, i
    ).where(
        Cond.and(
            i.col('id').isIn([1,2,3]),
            i.col('representative_clip_id').is('=', c.col('id')),
            c.col('representative_collection_id').is('=', co.col('id')),
            c.col('user_profile_id').is('=', u.col('id'))
        )
    )
    ;
    */
    var notDelete = function(table) {
        table.where(
            table.col('deleted').isNull()
                .or(table.col('deleted').isFalse())
        );
    };

    var s = new Table('students').as('s');
    notDelete(s);
    s.where(s.col('birth_date').is('>', new Date(1974, 11, 8)));

    var c = new Table('courses').as('c');
    notDelete(c);

    var c2 = new Table('courses').as('c2');
    notDelete(c2);

    var r = new Table('registrations').as('r');
    notDelete(r);

    var q1 = new Query().select(
            s.all()
        ).from(
            s
                .join(r).on(r.col('student_id').is('=', s.col('id')))
                .join(c).on(c.col('id').is('=', r.col('course_id')))
        ).where(
            c.col('credits').is('>=', 4)
                .and(s.col('gender').is('=', 'male').not())
                .and(r.col('date_created').is('<', '2014-10-01'))
                .and(new Query().select(c2.col('id')).from(c2).where(c2.col('credits').is('>', c.col('credits'))).exists().not())
        ).group(s.col('id')).having(
            c.col('id').count().is('>', 2)
                .and(c.col('credits').sum().is('<=', 10))
        ).asc(
            s.col('last_name')
        ).desc(
            s.col('birth_date')
        ).limit(20).offset(10)
        ;

    var q2 = new Query().select(
            s.all()
        ).from(
            s
        ).where(
            s.col('gender').is('=', 'mail')
        )
        ;


    // var q = q1.union(q2);


    var q = new qoop.Query().select(
        co.all(), cv.col('id').as('cv_id')
    ).from(
        co
            .leftJoin(cv).on(cv.col('collection_id').is('=', co.col('id')).and(cv.col('user_profile_id').is('=', 5)))
    ).where(
        co.col('user_profile_id').is('=', 46)
    );


    /*
    var q = new Query().select(
        c.all(),
        u.col('user_info').as('user_info'),
        co.col('title').sum().as('collection_title'),
        i.col('asset_info').as('asset_info'),
        i.col('id').as('original_item_id'),
        i.col('clip_count').as('clip_count')
    ).from(
        i
            .join(c).on(i.col('representative_clip_id').is('=', c.col('id')))
            .join(u).on(c.col('user_profile_id').is('=', u.col('id')))
            .join(co).on(c.col('representative_collection_id').is('=', co.col('id'))),
        new Query().select(u.all()).from(u).where(u.col('clip_count').is('=', 1)).as('user_test')
    ).where(
        i.col('id').isIn([1,2,3])
            .and(i.col('date_created').is('<', new Date()))
            .and(co.col('clip_count').is('>', i.col('clip_count')))
    ).group(u.col('id')).having(
        u.col('collection_count').count().is('>', u.col('clip_count').sum())
    ).limit(100).offset(200)
    ;
    */

    console.log(q.toS());
})();






