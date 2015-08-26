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
		return evaluate(exp[exp.length - 1], env);
	}

	// [.cond cond1, exp1, cond2, exp2, ... [condi], expi]
	function evalCond(exp, env) {
		for (var i = 1; i < exp.length - 1; i += 2) if (evaluate(exp[i], env)) return evaluate(exp[i + 1], env);
		return evaluate(exp[exp.length - 1], env);
	}

	function environment(parent) {
		var map = {};
		return function (key, value) {
			return value !== undefined ? map[key] = value : map[key] !== undefined ? map[key] : parent(key);
		};
	}

	function closure(lambda, env) {
		return { lambda: lambda, env: env };
	}

	function evaluate(exp, env) {
		var head = exp[0];
		if (head === LET) return evalLet(exp, env);else if (head === LETREC) return evalLetrec(exp, env);else if (head === SET) return evalSet(exp, env);else if (head === IF || head === COND) return evalCond(exp, env);

		// core evaluation
		else if (head === LAMBDA) return closure(exp, env);else if (Array.isArray(exp)) return apply(evaluate(exp[0], env), exp.slice(1).map(function (e) {
				return evaluate(e, env);
			}));else return env(exp);
	}

	function apply(func, args) {
		// apply buildin function
		if (func.apply) return func.apply(null, args);

		// core apply
		var lambda = func.lambda,
		    env = environment(func.env);
		args.forEach(function (a, i) {
			return env(lambda[i + 1], a);
		});
		return evaluate(lambda[lambda.length - 1], env);
	}

	function rootenv() {
		var env = function env(key, value) {
			if (value !== undefined) return map[key] = value;else if (typeof key !== 'string') return key;else if (key[0] === '"') return key.substr(1);else if (map[key] !== undefined) return map[key];else throw 'undefined variable `' + key + '`!';
		};
		var map = {

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

			'print': function print() {
				console.log.apply(console, arguments);
				return arguments[arguments.length - 1];
			},

			'begin': function begin() {
				return arguments[arguments.length - 1];
			},

			'for': function _for(iterator, func) {
				var data = [];
				while (data = apply(iterator, data)) apply(func, data);
			},

			'range': function range() {
				var start = 0,
				    step = 1,
				    end = 0,
				    args = Array.prototype.slice.apply(arguments);
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

			'.': function _(a, b, v) {
				return v !== undefined ? (a[b] = v, a) : a[b];
			},

			'array': function array() {
				return Array.prototype.slice.apply(arguments);
			},

			'dict': function dict() {
				var d = {},
				    j = 0;
				for (var i = 0; i < arguments.length; i += 2) {
					var k = arguments[i],
					    v = arguments[i + 1];
					d[k === null ? j++ : k] = v;
				}
				return d;
			}

		};
		/*
   * some sample functions
   *
  'cons': (a, b) => [a, b],
  'car': (a) => a[0],
  'cdr': (a) => a[1],
  'list': () => Array.prototype.slice.apply(arguments)
  	.reduceRight((l, a) => [a, l], [ ]),
  'map': (l, f) => l.length === 0 ? [ ] :
  	[apply(f, [ l[0] ]), apply(map.map, [ l[1], f ])],
  		'array': () => Array.prototype.slice.apply(arguments),
  'array-map': (a, f) => a.map((v, i) => apply(f, [v, i])),
  		'*2': closure([LAMBDA, 'x', ['*', 'x', 2]], env),
  */
		return env;
	}

	evaluate.rootenv = rootenv;
	evaluate.environment = environment;

	if (typeof module !== 'undefined') module.exports = evaluate;else if (typeof window !== 'undefined') window.evaluate = evaluate;
})();