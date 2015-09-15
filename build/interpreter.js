'use strict';

(function () {

	// [.let var1, val1, var2, val2, exp] =>
	//   [[.lambda var1 var2 exp] val1 val2]
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

	// [.letrec var1, val1, var2, val2, ... exp] =>
	//   evaluate(exp, env_ext)
	function evalLetrec(exp, env) {
		env = environment(env);
		for (var i = 1; i < exp.length - 1; i += 2) env.update(exp[i], evaluate(exp[i + 1], env));
		return evaluate(exp[exp.length - 1], env);
	}

	// [.set var1 val1, var2, val2, ...]
	function evalSet(exp, env) {
		for (var i = 1; i < exp.length - 1; i += 2) exp[i + 1] = evaluate(exp[i + 1], env);
		for (var i = 1; i < exp.length - 1; i += 2) env.set(exp[i], exp[i + 1]);
		return i < exp.length ? evaluate(exp[i], env) : null;
	}

	// [.cond cond1, exp1, cond2, exp2, ... [condi], expi]
	function evalCond(exp, env) {
		for (var i = 1; i < exp.length - 1; i += 2) if (evaluate(exp[i], env)) return evaluate(exp[i + 1], env);
		return i < exp.length ? evaluate(exp[i], env) : null;
	}

	function environment(parent, local) {
		var env = {
			parent: parent,
			local: local || {},
			lookup: function lookup(name) {
				var env = this;
				while (env && !(name in env.local)) env = env.parent;
				return env && env.local || this.local;
			},
			get: function get(name) {
				return this.lookup(name)[name];
			},
			set: function set(name, value) {
				return this.lookup(name)[name] = value;
			},
			update: function update(name, value) {
				return this.local[name] = value;
			}
		};
		env.update('local', env);
		return env;
	}

	function closure(lambda, parent) {
		return function () {
			var env = environment(parent);
			env.update('self', this);
			env.update('args', Array.prototype.slice.call(arguments));
			for (var i = 1; i < lambda.length - 1; i++) env.update(lambda[i], arguments[i - 1]);
			return evaluate(lambda[lambda.length - 1], env);
		};
	}

	function evaluate(exp, env) {
		if (Array.isArray(exp)) {
			var head = exp[0];
			if (head === 'let') return evalLet(exp, env);else if (head === 'letrec') return evalLetrec(exp, env);else if (head === 'set') return evalSet(exp, env);else if (head === 'if') return evalCond(exp, env);else if (head === 'lambda') return closure(exp, env);else return evaluate(exp[0], env).apply(env.get('self'), exp.slice(1).map(function (e) {
				return evaluate(e, env);
			}));
		} else if (typeof exp === 'string') {
			if (exp[0] === '"') return exp.substr(1);else return env.get(exp);
		} else {
			// there is no undefined in the language
			if (exp === undefined) return null;else return exp;
		}
	}

	evaluate.environment = environment;

	if (typeof module !== 'undefined') module.exports = evaluate;else if (typeof window !== 'undefined') window.evaluate = evaluate;
})();