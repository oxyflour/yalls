(function() {

Function.prototype.apply2 = function(self, args, arga, kont) {
    if (!this.extraArgs) this.extraArgs = [ ]
        
    this.extraArgs.push(this.arga)
    this.arga = arga

    var ret = this.apply(self, args)

    this.arga = this.extraArgs.pop()
    return ret
}

/*
 * CEK machine implement
 */

function environment(parent, local) {
    local = local || { }

    // directly access local with 'local'
    local.local = local

    // save env as '@' so that variables can be access with 'local.var'
    local['@'] = function(name, value, setParent) {
        if (arguments.length > 1)
            return !(name in local) && parent && setParent ?
                parent.apply(null, arguments) : (local[name] = value)
        else
            return !(name in local) && parent ? parent(name) : local[name]
    }

    // allow overwritting seek function
    return function() {
        return local['@'].apply(local, arguments)
    }
}

function callenv(lambda, parent, self, args, arga) {
    var env = environment(parent)

    env('self', self)

    env('args', args)
    for (var i = 1; i < lambda.length - 1; i ++)
        env(lambda[i], args[i - 1])

    env('arga', arga || { })
    if (arga) for (var k in arga)
        env(k, arga[k])

    return env
}

function value(exp, env) {
    if (typeof(exp) === 'string')
        return exp.substr(0, 1) === '"' ? exp.substr(1) : env(exp)
    else
        return exp
}

function closure(lambda, parent) {
    var clo = function() {
        var env = callenv(lambda, parent, this, arguments, clo.arga)
        return run(lambda[lambda.length - 1], env)
    }
    clo.yallsClosure = { lambda, parent }
    return clo
}

function continuation(kont) {
    var con = function(value) {
        throw 'RuntimeError: continuation can only be called from interval env'
    }
    con.yallsContinuation = kont
    return con
}

function applyProc(proc, self, paras, kont) {
    var args = [ ], arga = { }
    paras.forEach(e => {
        if (Array.isArray(e) && e[0] === 'name=arg')
            arga[ e[1] ] = e[2]
        else
            args.push(e)
    })

    if (proc && proc.yallsClosure) {
        var { lambda, parent } = proc.yallsClosure,
            env = callenv(lambda, parent, self, args, arga)
        return [lambda[lambda.length - 1], env, kont]
    }
    else if (proc && proc.yallsContinuation) {
        return applyKont(proc.yallsContinuation, args[0])
    }
    else if (typeof(proc) === 'function') {
        return applyKont(kont, proc.apply2(self, args, arga))
    }
    else {
        console.log(proc)
        throw 'RuntimeError: ' + proc + ' is not a function!'
    }
}

function applyKont(kont, value) {
    if (kont) {
        var [name, exp, env, lastKont] = kont
        env = environment(env)
        env(name, value)
        return [exp, env, lastKont]
    }
    else {
        return [value]
    }
}

function step(exp, env, kont) {
    if (!(exp && exp.isStatement)) {
        return applyKont(kont, value(exp, env))
    }

    var head = exp[0]
    if (head === 'lambda') {
        return [closure(exp, env), env, kont]
    }
    // if a e1 e2
    else if (head === 'if') {
        return [value(exp[1], env) ? exp[2] : exp[3], env, kont]
    }
    // let v e1 b
    else if (head === 'let') {
        return [exp[2], env, [exp[1], exp[3], env, kont]]
    }
    // set v1 a1 v2 a2 ...
    else if (head === 'set') {
        for (var i = 1, pair = [ ]; i < exp.length; i += 2)
            pair.push(exp[i], value(exp[i + 1], env))
        for (var i = 0, last = undefined; i < pair.length; i += 2)
            last = env(pair[i], pair[i + 1], true)
        return applyKont(kont, last)
    }
    // name=arg name arg
    else if (head === 'name=arg') {
        return applyKont(kont, ['name=arg', value(exp[1], env), value(exp[2], env)])
    }
    // call/cc a
    else if (head === 'callcc') {
        return applyProc(value(exp[1], env), env('self'), [continuation(kont)], kont)
    }
    // : obj method a ...
    else if (head === ':') {
        var args = exp.slice(3).map(a => value(a, env))
        return applyProc(value(exp[2], env), value(exp[1], env), args, kont)
    }
    // fn a a ...
    else {
        var args = exp.slice(1).map(a => value(a, env))
        return applyProc(value(exp[0], env), env('self'), args, kont)
    }
}

// http://matt.might.net/articles/a-normalization/
function anf(exp) {
    if (!Array.isArray(exp))
        return exp

    var wrapper = [ ]
    function wrap(exp) {
        var s = '#g' + (anf.index = (anf.index || 0) + 1)
        wrapper.push([s, exp])
        return s
    }

    var head = exp[0]
    if (head === 'lambda') {
        // do nothing
    }
    else if (head === 'if') {
        // [if c1 e1 c2 e2 ...] -> [if c1 e1 [if c2 e2]]
		if (exp.length > 4)
			exp = ['if', exp[1], exp[2], ['if'].concat(exp.slice(3))]
        // [if [...] exp1 exp2] -> [let $ [...] [if $ exp1 exp2]]
        if (Array.isArray(exp[1]))
            exp[1] = wrap(exp[1])
    }
    else if (head === 'and') {
        // [and e1 e2]
        var s = exp[1]
        if (Array.isArray(s))
            s = wrap(s)
        exp = ['if', s, exp[2], s]
    }
    else if (head === 'or') {
        // [or e1 e2]
        var s = exp[1]
        if (Array.isArray(s))
            s = wrap(s)
        exp = ['if', s, s, exp[2]]
    }
    else if (head === 'let') {
        // [let exp] -> [let nil nil exp]
        if (exp.length < 4)
            exp = ['let', undefined, undefined, exp[exp.length - 1]]
        // [let v1 e1 v2 e2 body] -> [let v1 e1 [let v2 e2 body]]
		else if (exp.length > 4)
			exp = ['let', exp[1], exp[2], ['let'].concat(exp.slice(3))]
    }
    else if (head === 'set') {
        // [set v1 [...] v2 [...]] ->
        //   [let $2 [...] [let $3 [...] [set v1 $2 v2 $3]]]
        var syms = { }, needsWrap = false
        for (var i = 1; i < exp.length; i += 2)
            if (Array.isArray(exp[i + 1]))
                needsWrap = syms[i + 1] = exp[i + 1]
        if (needsWrap)
            exp = exp.map((e, i) => syms[i] ? wrap(syms[i]) : e)
    }
    else {
        // [cexp cexp1] -> [let $1 cexp1 [let $2 cexp2 [$1 $2]]]
        if (Array.isArray(exp[0]))
            exp[0] = wrap(exp[0])
        // all the arguments must be wrapped because they may change when evaluating
        for (var i = 1; i < exp.length; i ++)
            if (Array.isArray(exp[i]) || typeof(exp[i]) === 'string')
                exp[i] = wrap(exp[i])
    }

    exp = exp.map(anf)
    wrapper.reverse().forEach(pair => {
        exp = ['let', pair[0], anf(pair[1]), exp]
    })
    return exp
}

function stmt(exp) {
    if (Array.isArray(exp)) {
        exp = exp.map(stmt)
        exp.isStatement = true
    }
    return exp
}

function run(exp, env, kont) {
    if (!exp.isStatement) {
        exp = anf(exp)
        exp = stmt(exp)
    }

    var state = [exp, env, kont]
    while (state[0] && state[0].isStatement || state[2])
        state = step.apply(undefined, state)
    return state[0]
}

run.environment = environment

if (typeof(module) !== 'undefined')
	module.exports = run
else if (typeof(window) !== 'undefined')
	window.evaluate = run

})()
