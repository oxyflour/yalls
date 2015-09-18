'use strict';

(function () {

	// [let var1 val1 var2 val2 exp] =>
	//   [[lambda var1 var2 exp] val1 val2]
	function evalLet(exp, env) {
		var lambda = ['lambda'],
		    body = [lambda];
		for (var i = 1; i < exp.length - 1; i += 2) {
			lambda.push(exp[i]);
			body.push(exp[i + 1]);
		}
		lambda.push(exp[exp.length - 1]);
		return evaluate(body, env);
	}

	// [set var1 val1 var2 val2 ... body]
	function evalLetrec(exp, env) {
		var pair = [];
		for (var i = 1; i < exp.length - 1; i += 2) pair.push(exp[i], evaluate(exp[i + 1], env));
		env = environment(env);
		for (var i = 0; i < pair.length - 1; i += 2) env.update(pair[i], pair[i + 1]);
		return evaluate(exp[exp.length - 1], env);
	}

	// [set var1 val1 var2 val2 ...]
	function evalSet(exp, env) {
		var pair = [];
		for (var i = 1; i < exp.length - 1; i += 2) pair.push(exp[i], evaluate(exp[i + 1], env));
		var last = undefined;
		for (var i = 0; i < pair.length - 1; i += 2) env.update(pair[i], last = pair[i + 1]);
		return last;
	}

	// [cond cond1 exp1 cond2 exp2 ... [condi] expi]
	function evalCond(exp, env) {
		for (var i = 1; i < exp.length - 1; i += 2) if (evaluate(exp[i], env)) return evaluate(exp[i + 1], env);
		return i < exp.length ? evaluate(exp[i], env) : undefined;
	}

	function environment(parent, local) {
		local = local || {};
		var env = {
			clone: function clone(loc) {
				loc = loc || {};
				for (var k in local) loc[k] = local[k];
				return environment(parent, loc);
			},
			has: function has(name) {
				return name in local || parent && parent.has(name);
			},
			get: function get(name) {
				return !parent || name in local ? local[name] : parent.get(name);
			},
			/*
    * overwritting variables in parent env is disabled
    *
   set: function(name, value) {
   	return !parent || name in local ?
   		(local[name] = value) : parent.set(name, value)
   },
    */
			update: function update(name, value) {
				return local[name] = value;
			}
		};
		env.update('local', env);
		return env;
	}

	function closure(lambda, parent) {
		var clo = function clo() {
			var env = environment(parent);

			env.update('self', this);

			env.update('args', Array.prototype.slice.call(arguments));
			for (var i = 1; i < lambda.length - 1; i++) env.update(lambda[i], arguments[i - 1]);

			env.update('arga', clo.arga || {});
			if (clo.arga) for (var k in clo.arga) env.update(k, clo.arga[k]);

			return evaluate(lambda[lambda.length - 1], env);
		};
		return clo;
	}

	function apply(exp, env) {
		var args = [],
		    arga = {};
		exp.slice(1).forEach(function (e) {
			if (Array.isArray(e) && e[0] === 'name=arg') arga[evaluate(e[1], env)] = evaluate(e[2], env);else args.push(evaluate(e, env));
		});

		var proc = evaluate(exp[0], env);
		proc.arga = arga;
		return proc.apply(env.get('self'), args);
	}

	function evaluate(_x, _x2) {
		var _left;

		var _again = true;

		_function: while (_again) {
			var exp = _x,
			    env = _x2;
			head = undefined;
			_again = false;

			if (Array.isArray(exp)) {
				var head = exp[0];
				if (head === 'let') return evalLet(exp, env);else if (head === 'letrec') return evalLetrec(exp, env);else if (head === 'set') return evalSet(exp, env);else if (head === 'if') return evalCond(exp, env);else if (head === 'and') {
					if (!(_left = evaluate(exp[1], env))) {
						return _left;
					}

					_x = exp[2];
					_x2 = env;
					_again = true;
					continue _function;
				} else if (head === 'or') {
					if (_left = evaluate(exp[1], env)) {
						return _left;
					}

					_x = exp[2];
					_x2 = env;
					_again = true;
					continue _function;
				} else if (head === 'lambda') return closure(exp, env);else return apply(exp, env);
			} else if (typeof exp === 'string') {
				if (exp[0] === '"') return exp.substr(1);else return env.get(exp);
			} else {
				return exp;
			}
		}
	}

	evaluate.environment = environment;

	if (typeof module !== 'undefined') module.exports = evaluate;else if (typeof window !== 'undefined') window.evaluate = evaluate;
})();