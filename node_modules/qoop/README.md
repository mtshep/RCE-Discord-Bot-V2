qoop
====

A purely object oriented mysql query builder.

# Install

```sh
npm install qoop
```

# Use

```js
var qoop = require('qoop');
var Query = qoop.Query;
var Table = qoop.Table;
```

# APIs

## Query
* new Query
* select
* from
* where
* asc
* desc
* limit
* offset
* group
* having
* union

## Table
* new Table
* col
* as
* where
* all
* join
* leftJoin
* rightJoin
* leftOuterJoin
* rightOuterJoin

## Join
* on

## Column
* as
* isNull
* isNotNull
* isTrue
* isFalse
* is
* isIn
* count
* distinct
* min
* max
* sum

## Condition
* and
* or
* not

# Example

```js
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


var q = q1.union(q2);

```
