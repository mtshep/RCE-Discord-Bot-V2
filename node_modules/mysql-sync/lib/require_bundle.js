

var requireBundle = function(name) {
	switch(name) {
		case 'sync':
			return [
				'var sync = require("node-sync").sync5;',
				'var co = sync.co;',
				'var proc = sync.proc;',
				'var $let = sync.$let;',
				'var $get = sync.$get;',
				'var lift = sync.lift;',
				'var Thread = sync.Thread;',
				'var sleep = sync.sleep;'
			];
		case 'common':
			return [
				'var $U =require("underscore");',
				'var uuid = require("uuid");',
				'var mysql = require("mysql");'
			];
		default: 
			throw new Error('requireBundle does not support: ' + name);

	}
};

module.exports = function() {
	var l = [];

	for (var i = 0; i < arguments.length; i++) {
		var bundleName = arguments[i];
		l = l.concat(requireBundle(bundleName));
	}

	return l.join('');
};

