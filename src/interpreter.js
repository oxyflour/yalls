(function() {

// [let var1 val1 var2 val2 exp] =>
//   [[lambda var1 var2 exp] val1 val2]
function evalLet(exp, env) {
	var lambda = [ 'lambda' ],
		body = [ lambda ]
	for (var i = 1; i < exp.length - 1; i += 2) {
		lambda.push(exp[i])
		body.push(exp[i + 1])
	}
	lambda.push(exp[exp.length - 1])
	return evaluate(body, env)
}

// [set var1 val1 var2 val2 ... body]
function evalLetrec(exp, env) {
	var pair = [ ]
	for (var i = 1; i < exp.length - 1; i += 2)
		pair.push(exp[i], evaluate(exp[i + 1], env))
	env = environment(env)
	for (var i = 0; i < pair.length - 1; i += 2)
		env.update(pair[i], pair[i + 1])
	return evaluate(exp[exp.length - 1], env)
}

// [set var1 val1 var2 val2 ...]
function evalSet(exp, env) {
	var pair = [ ]
	for (var i = 1; i < exp.length - 1; i += 2)
		pair.push(exp[i], evaluate(exp[i + 1], env))
	var last = null
	for (var i = 0; i < pair.length - 1; i += 2)
		env.update(pair[i], last = pair[i + 1])
	return last
}

// [cond cond1 exp1 cond2 exp2 ... [condi] expi]
function evalCond(exp, env) {
	for (var i = 1; i < exp.length - 1; i += 2)
		if (evaluate(exp[i], env))
			return evaluate(exp[i + 1], env)
	return i < exp.length ? evaluate(exp[i], env) : null
}

function environment(parent, local) {
	var env = {
		parent: parent,
		local: local || { },
		lookup: function(name) {
			var env = this
			while (env && !(name in env.local)) env = env.parent
			return env && env.local || this.local
		},
		get: function(name) {
			return this.lookup(name)[name]
		},
		set: function(name, value) {
			return this.lookup(name)[name] = value
		},
		update: function(name, value) {
			return this.local[name] = value
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
	var proc = evaluate(exp[0], env),
		args = exp.slice(1).map(e => evaluate(e, env))
	return proc.apply(env.get('self'), args)
}

function evaluate(exp, env) {
	if (Array.isArray(exp)) {
		var head = exp[0]
		if (head === 'let')
			return evalLet(exp, env)
		else if (head === 'letrec')
			return evalLetrec(exp, env)
		else if (head === 'set')
			return evalSet(exp, env)
		else if (head === 'if')
			return evalCond(exp, env)
		else if (head === 'lambda')
			return closure(exp, env)
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

evaluate.environment = environment

if (typeof(module) !== 'undefined')
	module.exports = evaluate
else if (typeof(window) !== 'undefined')
	window.evaluate = evaluate

})()
