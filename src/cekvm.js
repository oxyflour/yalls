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
    function env(name, value, setParent) {
        if (arguments.length > 1)
            return !(name in local) && parent && setParent ?
                parent(name, value, setParent) : (local[name] = value)
        else
            return !(name in local) && parent ?
                parent(name) : local[name]
    }

    // directly access local with 'local'
    local.local = local
    // save env as '@' so that variables can be access with 'local.var'
    local['@'] = env
    // allow overriding '@' of local
    return function proxy(name, value, setParent) {
        if (arguments.length > 1)
            return name[0] === '#' ?
                env(name, value, setParent) : local['@'](name, value, setParent)
        else
            return name[0] === '#' ?
                env(name) : local['@'](name)
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
        return env(exp)
    else if (exp && exp.yallsString !== undefined)
        return exp.yallsString
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

function namedArg(name, value) {
    return { name, value, isNamedArg:true }
}

function prepareProc(exp, env) {
    var self = env('self'),
        proc = value(exp[0], env)

    var args = [ ], arga = { }
    for (var i = 1; i < exp.length; i ++) {
        var e = value(exp[i], env)
        if (e && e.isNamedArg)
            arga[ e.name ] = e.value
        else
            args.push(e)
    }

    if (arga['@self'] !== undefined) {
        self = arga['@self']
        delete arga['@self']
    }
    if (arga['@args'] !== undefined) {
        args = arga['@args']
        delete arga['@args']
    }

    return { self, proc, args, arga }
}

function applyProc(self, proc, args, arga, kont) {
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
        throw 'RuntimeError: ' + proc + ' is not a function!'
    }
}

function applyKont(kont, value) {
    if (kont) {
        var [name, exp, env, lastKont] = kont
        // we don't create new environment for each let
        //env = environment(env)
        env(name, value)
        return [exp, env, lastKont]
    }
    else {
        return [value]
    }
}

function applySet(exp, env, kont, setParent) {
    for (var i = 1, pair = [ ]; i < exp.length; i += 2)
        pair.push(exp[i], value(exp[i + 1], env))
    for (var i = 0, last = undefined; i < pair.length; i += 2)
        last = env(pair[i], pair[i + 1], setParent)
    return applyKont(kont, last)
}

function step(exp, env, kont) {
    if (!(exp && exp.isStatement))
        return applyKont(kont, value(exp, env))

    var func = stepStmts[ exp[0] ] || stepStmts.apply
    return func(exp, env, kont)
}

var stepStmts = {
    // closure
    'lambda': function(exp, env, kont) {
        return [closure(exp, env), env, kont]
    },
    // let v e1 b
    'let': function(exp, env, kont) {
        return [exp[2], env, [exp[1], exp[3], env, kont]]
    },
    // if a e1 e2
    'if': function(exp, env, kont) {
        return [value(exp[1], env) ? exp[2] : exp[3], env, kont]
    },
    // set v1 a1 v2 a2 ...
    'set-local': function(exp, env, kont) {
        return applySet(exp, env, kont, false)
    },
    // set v1 a1 v2 a2 ...
    'set-env': function(exp, env, kont) {
        return applySet(exp, env, kont, true)
    },
    // if a e1 e2
    'begin': function(exp, env, kont) {
        return applyKont(kont, value(exp[exp.length - 1], env))
    },
    // call/cc a
    'callcc': function(exp, env, kont) {
        var self = env('self'), proc = value(exp[1], env)
        return applyProc(self, proc, [continuation(kont)], { }, kont)
    },
    // name-arg name arg
    'named-arg': function(exp, env, kont) {
        var name = value(exp[1], env), arg = value(exp[2], env)
        return applyKont(kont, namedArg(name, arg))
    },
    // fn a a ...
    'apply': function(exp, env, kont) {
        var { self, proc, args, arga } = prepareProc(exp, env)
        return applyProc(self, proc, args, arga, kont)
    },
    // eval compiledCode
    'eval': function(exp, env, kont) {
        var code = value(exp[1], env)
        return [expression(code), env, kont]
    },
}

// http://matt.might.net/articles/a-normalization/
function anf(exp) {
    if (!Array.isArray(exp))
        return exp

    var func = anfRules[ exp[0] ] || anfRules.apply,
        wrapper = [ ]

    exp = func(exp, function(exp) {
        var sym = '#a' + (anf.index = (anf.index || 0) + 1)
        wrapper.push([sym, exp])
        return sym
    })

    exp = exp.map(anf)

    wrapper.reverse().forEach(pair => {
        exp = ['let', pair[0], anf(pair[1]), exp]
    })

    return exp
}

var anfRules = {
    // [lambda v ... b] -> [lambda v ... b]
    'lambda': function(exp, wrap) {
        return exp
    },
    // [let v e b] -> [let v e b]
    'let': function(exp, wrap) {
        return exp
    },
    // [set v1 [...] v2 [...]] -> [let #0 [set v1 v1 v2 v2]
    //                                    [let #1 [...] [let #2 [...] [set-env v1 #1 v2 #2]]]]
    'set-local': function(exp, wrap) {
        var syms = { }, needsWrap = false
        for (var i = 2; i < exp.length; i += 2) {
            if (Array.isArray(exp[i]))
                needsWrap = syms[i] = exp[i]
        }
        if (needsWrap) {
            wrap(exp.map((e, i) => syms[i] ? exp[i - 1] : e))
            exp = exp.map((e, i) => syms[i] ? wrap(e) : e)
            exp[0] = 'set-env'
        }
        return exp
    },
    // [set-env v1 [...] v2 [...]] -> [let #1 [...] [let #2 [...] [set-env v1 #1 v2 #2]]]
    'set-env': function(exp, wrap) {
        for (var i = 2; i < exp.length; i += 2)
            if (Array.isArray(exp[i]))
                exp[i] = wrap(exp[i])
        return exp
    },
    // [if [...] e1 e2] -> [let # [...] [if # e1 e2]]
    'if': function(exp, wrap) {
        if (Array.isArray(exp[1]))
            exp[1] = wrap(exp[1])
        return exp
    },
    // [c c1] -> [let #1 c [let #2 c1 [#1 #2]]]
    'apply': function(exp, wrap) {
        if (Array.isArray(exp[0]))
            exp[0] = wrap(exp[0])
        // all the arguments must be wrapped because they may change when evaluating
        for (var i = 1; i < exp.length; i ++)
            if (Array.isArray(exp[i]) || typeof(exp[i]) === 'string')
                exp[i] = wrap(exp[i])
        return exp
    },
}

function compile(tree) {
    if (Array.isArray(tree))
        return tree.map(compile)
    else if (tree === null || tree === undefined)
        return undefined
    else if (tree.type === 'STR')
        return { yallsString:tree.value }
    else if (tree.value !== undefined)
        return tree.value
    else
        return tree
}

function expression(exp, index) {
    if (Array.isArray(exp)) {
        exp.forEach(expression)
        exp.isStatement = true
    }
    else if (index === undefined) {
        exp = ['begin', exp]
        exp.isStatement = true
    }
    return exp
}

function run(code, env, kont) {
    var state = [expression(code), env, kont]
    while (state[0] && state[0].isStatement || state[2])
        state = step.apply(undefined, state)
    return state[0]
}

run.environment = environment
run.compile = function(tree) {
    return anf(compile(tree))
}

module.exports = run