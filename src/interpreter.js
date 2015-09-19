(function() {

function environment(parent, local) {
	local = local || { }
	var env = {
		clone: function(loc) {
			loc = loc || { }
			for (var k in local)
				loc[k] = local[k]
			return environment(parent, loc)
		},
		has: function(name) {
			return name in local || parent && parent.has(name)
		},
		get: function(name) {
			return !parent || name in local ?
				local[name] : parent.get(name)
		},
		/*
		 * overwritting variables in parent env is disabled
		 *
		set: function(name, value) {
			return !parent || name in local ?
				(local[name] = value) : parent.set(name, value)
		},
		 */
		update: function(name, value) {
			return local[name] = value
		},
	}
	env.update('local', env)
	return env
}

function closure(lambda, parent) {
	var clo = function() {
		var env = environment(parent)

		env.update('self', this)

		env.update('args', Array.prototype.slice.call(arguments))
		for (var i = 1; i < lambda.length - 1; i ++)
			env.update(lambda[i], arguments[i - 1])

		env.update('arga', clo.arga || { })
		if (clo.arga) for (var k in clo.arga)
			env.update(k, clo.arga[k])

		return evaluate(lambda[lambda.length - 1], env)
	}
	return clo
}

function apply(exp, env) {
	var args = [ ], arga = { }
	exp.slice(1).forEach(e => {
		if (Array.isArray(e) && e[0] === 'name=arg')
			arga[evaluate(e[1], env)] = evaluate(e[2], env)
		else
			args.push(evaluate(e, env))
	})

	var proc = evaluate(exp[0], env)
	proc.arga = arga
	return proc.apply(env.get('self'), args)
}

function evaluate(exp, env) {
	if (Array.isArray(exp)) {
		var head = exp[0]
		if (head === 'lambda')
			return closure(exp, env)
		else if (head = stmts[head])
			return head(exp, env)
		else
			return apply(exp, env)
	}
	else if (typeof(exp) === 'string') {
		if (exp[0] === '"')
			return exp.substr(1)
		else
			return env.get(exp)
	}
	else {
		return exp
	}
}

var stmts = {

	// [let var1 val1 var2 val2 exp] =>
	//   [[lambda var1 var2 exp] val1 val2]
	'let': function(exp, env) {
		var lambda = [ 'lambda' ],
			body = [ lambda ]
		for (var i = 1; i < exp.length - 1; i += 2) {
			lambda.push(exp[i])
			body.push(exp[i + 1])
		}
		lambda.push(exp[exp.length - 1])
		return evaluate(body, env)
	},

	// [set var1 val1 var2 val2 ... body]
	'letrec': function(exp, env) {
		var pair = [ ]
		for (var i = 1; i < exp.length - 1; i += 2)
			pair.push(exp[i], evaluate(exp[i + 1], env))
		env = environment(env)
		for (var i = 0; i < pair.length - 1; i += 2)
			env.update(pair[i], pair[i + 1])
		return evaluate(exp[exp.length - 1], env)
	},

	// [set var1 val1 var2 val2 ...]
	'set': function(exp, env) {
		var pair = [ ]
		for (var i = 1; i < exp.length - 1; i += 2)
			pair.push(exp[i], evaluate(exp[i + 1], env))
		var last = undefined
		for (var i = 0; i < pair.length - 1; i += 2)
			env.update(pair[i], last = pair[i + 1])
		return last
	},

	// [if cond1 exp1 cond2 exp2 ... [condi] expi]
	'if': function(exp, env) {
		for (var i = 1; i < exp.length - 1; i += 2)
			if (evaluate(exp[i], env))
				return evaluate(exp[i + 1], env)
		return i < exp.length ? evaluate(exp[i], env) : undefined
	},

	// [while test body]
	'while': function(exp, env) {
		var last
		while (evaluate(exp[1], env))
			last = evaluate(exp[2], env)
		return last
	},

	'and': function(exp, env) {
		return evaluate(exp[1], env) && evaluate(exp[2], env)
	},

	'or': function(exp, env) {
		return evaluate(exp[1], env) || evaluate(exp[2], env)
	},

}

evaluate.environment = environment

if (typeof(module) !== 'undefined')
	module.exports = evaluate
else if (typeof(window) !== 'undefined')
	window.evaluate = evaluate

})()
