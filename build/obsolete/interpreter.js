'use strict';

(function () {

	Function.prototype.apply2 = function (self, args, arga) {
		if (!this.extraArgs) this.extraArgs = [];

		this.extraArgs.push(this.arga);
		this.arga = arga;
		var ret = this.apply(self, args);
		this.arga = this.extraArgs.pop();

		return ret;
	};

	function environment(parent, local) {
		local = local || {};

		// directly access local with 'local'
		local.local = local;

		// save env as '@' so that variables can be access with 'local.var'
		local['@'] = function (name, value, setParent) {
			if (arguments.length > 1) return !(name in local) && parent && setParent ? parent.apply(null, arguments) : local[name] = value;else return !(name in local) && parent ? parent(name) : local[name];
		};

		// allow overwritting seek function
		return function () {
			return local['@'].apply(local, arguments);
		};
	}

	function closure(lambda, parent) {
		return function clo() {
			var env = environment(parent);

			env('self', this);

			env('args', Array.prototype.slice.call(arguments));
			for (var i = 1; i < lambda.length - 1; i++) env(lambda[i], arguments[i - 1]);

			env('arga', clo.arga || {});
			if (clo.arga) for (var k in clo.arga) env(k, clo.arga[k]);

			return evaluate(lambda[lambda.length - 1], env);
		};
	}

	function apply(exp, env) {
		var args = [],
		    arga = {};
		exp.slice(1).forEach(function (e) {
			if (Array.isArray(e) && e[0] === 'name=arg') arga[evaluate(e[1], env)] = evaluate(e[2], env);else args.push(evaluate(e, env));
		});

		var proc = evaluate(exp[0], env);
		if (!proc) throw 'YallsRuntime: ' + proc + ' is not a function';

		return proc.apply2(env('self'), args, arga);
	}

	function evaluate(exp, env) {
		if (Array.isArray(exp)) {
			var head = exp[0];
			if (head === 'lambda') return closure(exp, env);else if (head = stmts[head]) return head(exp, env);else return apply(exp, env);
		} else if (typeof exp === 'string') {
			if (exp[0] === '"') return exp.substr(1);else return env(exp);
		} else {
			return exp;
		}
	}

	var stmts = {

		// [let var1 val1 var2 val2 exp] =>
		//   [[lambda var1 var2 exp] val1 val2]
		'let': function _let(exp, env) {
			var lambda = ['lambda'],
			    body = [lambda];
			for (var i = 1; i < exp.length - 1; i += 2) {
				lambda.push(exp[i]);
				body.push(exp[i + 1]);
			}
			lambda.push(exp[exp.length - 1]);
			return evaluate(body, env);
		},

		// [set var1 val1 var2 val2 ... body]
		'letrec': function letrec(exp, env) {
			var pair = [];
			for (var i = 1; i < exp.length - 1; i += 2) pair.push(exp[i], evaluate(exp[i + 1], env));
			env = environment(env);
			for (var i = 0; i < pair.length - 1; i += 2) env(pair[i], pair[i + 1]);
			return evaluate(exp[exp.length - 1], env);
		},

		// [set var1 val1 var2 val2 ...]
		'set': function set(exp, env) {
			var pair = [];
			for (var i = 1; i < exp.length - 1; i += 2) pair.push(exp[i], evaluate(exp[i + 1], env));
			var last = undefined;
			for (var i = 0; i < pair.length - 1; i += 2) env(pair[i], last = pair[i + 1], true);
			return last;
		},

		// [if cond1 exp1 cond2 exp2 ... [condi] expi]
		'if': function _if(exp, env) {
			for (var i = 1; i < exp.length - 1; i += 2) if (evaluate(exp[i], env)) return evaluate(exp[i + 1], env);
			return i < exp.length ? evaluate(exp[i], env) : undefined;
		},

		// [while test body]
		'while': function _while(exp, env) {
			var last;
			while (evaluate(exp[1], env)) last = evaluate(exp[2], env);
			return last;
		},

		'and': function and(exp, env) {
			return evaluate(exp[1], env) && evaluate(exp[2], env);
		},

		'or': function or(exp, env) {
			return evaluate(exp[1], env) || evaluate(exp[2], env);
		},

		// [try exp var exp]
		'try': function _try(exp, env) {
			try {
				return evaluate(exp[1], env);
			} catch (e) {
				if (exp.length > 3) {
					env = environment(env);
					env(exp[2], e);
					return evaluate(exp[3], env);
				}
			}
		},

		// [throw exp]
		'throw': function _throw(exp, env) {
			throw evaluate(exp[1], env);
		}

	};

	evaluate.environment = environment;

	if (typeof module !== 'undefined') module.exports = evaluate;else if (typeof window !== 'undefined') window.evaluate = evaluate;
})();