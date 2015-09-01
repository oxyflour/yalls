'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

(function () {

	var LAMBDA = 'lambda';
	var LET = 'let';
	var LETREC = 'letrec';
	var SET = 'set';
	var IF = 'if';
	var COND = 'cond';

	// [.let var1, val1, var2, val2, exp] =>
	//   [[.lambda var1 var2 exp] val1 val2]
	function evalLet(exp, env) {
		var lambda = [LAMBDA],
		    body = [lambda];
		for (var i = 1; i < exp.length - 1; i += 2) {
			lambda.push(exp[i]);
			body.push(exp[i + 1]);
		}
		lambda.push(exp[exp.length - 1]);
		return evaluate(body, env);
	}

	// [.letrec var1, val1, var2, val2, ... exp] =>
	//   evaluate(exp, env_ext)
	function evalLetrec(exp, env) {
		env = environment(env);
		for (var i = 1; i < exp.length - 1; i += 2) env(exp[i], evaluate(exp[i + 1], env));
		return evaluate(exp[exp.length - 1], env);
	}

	// [.set var1 val1, var2, val2, ...]
	function evalSet(exp, env) {
		var pairs = [];
		for (var i = 1; i < exp.length - 1; i += 2) pairs.push([exp[i], evaluate(exp[i + 1], env)]);
		pairs.forEach(function (p) {
			return env(p[0], p[1]);
		});
		return pairs[0] && pairs[0][1];
	}

	// [.cond cond1, exp1, cond2, exp2, ... [condi], expi]
	function evalCond(exp, env) {
		for (var i = 1; i < exp.length - 1; i += 2) if (evaluate(exp[i], env)) return evaluate(exp[i + 1], env);
	}

	function environment(parent) {
		var local = {};
		return function (key, value) {
			if (arguments.length > 1) return local[key] = value;else if (key in local) return local[key];else return parent(key);
		};
	}

	function closure(lambda, env) {
		return function () {
			var e = environment(env);
			this && e('self', this);
			for (var i = 1; i < lambda.length - 1; i++) e(lambda[i], arguments[i - 1]);
			return evaluate(lambda[lambda.length - 1], e);
		};
	}

	function evaluate(exp, env) {
		if (Array.isArray(exp)) {
			var head = exp[0];
			if (head === LET) return evalLet(exp, env);else if (head === LETREC) return evalLetrec(exp, env);else if (head === SET) return evalSet(exp, env);else if (head === IF || head === COND) return evalCond(exp, env);else if (head === LAMBDA) return closure(exp, env);else return evaluate(exp[0], env).apply(env('self'), exp.slice(1).map(function (e) {
				return evaluate(e, env);
			}));
		} else if (typeof exp === 'string') {
			if (exp[0] === '"') return exp.substr(1);else return env(exp);
		} else {
			// there is no undefined in the language
			if (exp === undefined) return null;else return exp;
		}
	}

	function rootenv() {
		var env = function env(key) {
			if (key in local) return local[key];
			throw 'undefined variable `' + key + '`!';
		};

		var self = {

			$seek: function $seek(member) {
				var object = this;
				while (object && object[member] === undefined) object = object.$proto;
				if (object) return object[member];
			},

			$call: function $call(object, member, args) {
				var fn = self.$seek.call(object, member) || self[member];
				return fn.apply(object, args);
			},

			$get: function $get(object, member) {
				return self.$seek.call(object, member) || self[member];
			},

			derive: function derive() {
				return { $proto: this };
			},

			print: function print() {
				console.log(this);
			}

		};

		var local = {

			'self': self,

			'nil': null,

			'PI': Math.PI,

			'^': function _(a, b) {
				return Math.pow(a, b);
			},

			'*': function _(a, b) {
				return a * b;
			},
			'/': function _(a, b) {
				return a / b;
			},

			'+': function _(a, b) {
				return a + b;
			},
			'-': function _(a, b) {
				return a - b;
			},

			'>': function _(a, b) {
				return a > b;
			},
			'<': function _(a, b) {
				return a < b;
			},
			'=': function _(a, b) {
				return a == b;
			},
			'>=': function _(a, b) {
				return a >= b;
			},
			'<=': function _(a, b) {
				return a <= b;
			},
			'==': function _(a, b) {
				return a === b;
			},

			'begin': function begin() {
				return arguments[arguments.length - 1];
			},

			'while': function _while(test, func) {
				var ret;
				while (test()) ret = func();
				return ret;
			},

			'for': function _for(iterator, func) {
				var data = [],
				    ret = [];
				while (data = iterator.apply(null, data)) ret.push(func.apply(null, data));
				return ret;
			},

			'range': function range() {
				var start = 0,
				    step = 1,
				    end = 0,
				    args = Array.prototype.slice.call(arguments);
				if (args.length === 1) end = args[0];else if (args.length === 2) {
					;

					var _args = _slicedToArray(args, 2);

					start = _args[0];
					end = _args[1];
				} else if (args.length === 3) {
					;

					var _args2 = _slicedToArray(args, 3);

					start = _args2[0];
					step = _args2[1];
					end = _args2[2];
				}return function (i) {
					i = i === undefined ? start : i + step;
					if (i >= start && i < end) return [i];
				};
			},

			'pair': function pair(object) {
				var keys = Object.keys(object);
				return function (v, k, i) {
					i = i === undefined ? 0 : i + 1;
					if (i >= 0 && i < keys.length) {
						k = keys[i];
						return [object[k], k, i];
					}
				};
			},

			'ipair': function ipair(list) {
				return function (v, i) {
					i = i === undefined ? 0 : i + 1;
					if (i >= 0 && i < list.length) {
						return [list[i], i];
					}
				};
			},

			'.': function _(o, k, v) {
				return arguments.length > 2 ? (o[k] = v, o) : self.$get.call(o, o, k);
			},

			':': function _(o, k) {
				return self.$call.call(o, o, k, Array.prototype.slice.call(arguments).slice(2));
			},

			'array': function array() {
				return Array.prototype.slice.call(arguments);
			},

			'dict': function dict() {
				var k = [],
				    v = [],
				    d = {},
				    j = 0;
				for (var i = 0; i < arguments.length; i += 2) {
					var x = arguments[i],
					    y = arguments[i + 1];
					k.push(x);
					v.push(y);
					d[x !== null ? x : j++] = y;
				}
				return k.every(function (i) {
					return i === null;
				}) ? v : d;
			}

		};
		return env;
	}

	evaluate.environment = function (parent) {
		return environment(parent || rootenv());
	};

	if (typeof module !== 'undefined') module.exports = evaluate;else if (typeof window !== 'undefined') window.evaluate = evaluate;
})();