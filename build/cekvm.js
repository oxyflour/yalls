'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

(function () {

    /*
     * CEK machine implement
     */

    function environment(parent, local) {
        var env = function env(name, value) {
            var e = env;
            while (e && !(name in e.local)) e = e.parent;
            var local = e && e.local || env.local;
            return arguments.length > 1 ? local[name] = value : local[name];
        };
        env.parent = parent;
        env.local = local || {};
        return env;
    }

    function evaluate(exp, env) {
        if (typeof exp === 'string') return exp.substr(0, 1) === '"' ? exp.substr(1) : env(exp);else return exp;
    }

    function applyProc(proc, args, kont) {
        if (typeof proc === 'function') return [proc.apply(null, args), function (x) {
            return x;
        }, kont];

        var _proc = _slicedToArray(proc, 2);

        var lambda = _proc[0];
        var env = _proc[1];

        env = environment(env);
        for (var i = 1; i < lambda.length - 1; i++) env.local[lambda[i]] = args[i - 1];
        return [lambda[lambda.length - 1], env, kont];
    }

    function applyKont(kont, value) {
        var _kont = _slicedToArray(kont, 4);

        var name = _kont[0];
        var exp = _kont[1];
        var env = _kont[2];
        var lastKont = _kont[3];

        env = environment(env);
        env.local[name] = value;
        return [exp, env, lastKont];
    }

    function step(exp, env, kont) {
        if (!(exp && exp.isStatement)) {
            return applyKont(kont, evaluate(exp, env));
        }

        var head = exp[0];
        if (head === 'lambda') {
            return [[exp, env], env, kont];
        }
        // if a e1 e2
        else if (head === 'if') {
                return [evaluate(exp[1], env) ? exp[2] : exp[3] || null, env, kont];
            }
            // let v e1 b
            else if (head === 'let') {
                    return [exp[2], env, [exp[1], exp[3], env, kont]];
                }
                // set v1 a1 v2 a2
                else if (head === 'set') {
                        for (var i = 1; i < exp.length; i += 2) exp[i + 1] = evaluate(exp[i + 1], env);
                        for (var i = 1, last = null; i < exp.length; i += 2) last = env(exp[i], exp[i + 1]);
                        return applyKont(kont, last);
                    }
                    // call/cc a
                    else if (head === 'call/cc') {
                            return applyProc(evaluate(exp[1], env), [kont], kont);
                        }
                        // fn a a
                        else {
                                var args = exp.slice(1).map(function (a) {
                                    return evaluate(a, env);
                                });
                                return applyProc(evaluate(exp[0], env), args, kont);
                            }
    }

    // http://matt.might.net/articles/a-normalization/
    function anf(exp) {
        if (!Array.isArray(exp)) return exp;

        var wrapper = [];
        function wrap(exp) {
            var s = '#g' + (anf.index = (anf.index || 0) + 1);
            wrapper.push([s, exp]);
            return s;
        }

        var head = exp[0];
        if (head === 'lambda') {
            // do nothing
        } else if (head === 'if') {
                // [if c1 e1 c2 e2 ...] -> [if c1 e1 [if c2 e2]]
                if (exp.length > 4) exp = ['if', exp[1], exp[2], ['if'].concat(exp.slice(3))];
                // [if [...] exp1 exp2] -> [let $ [...] [if $ exp1 exp2]]
                if (Array.isArray(exp[1])) exp[1] = wrap(exp[1]);
            } else if (head === 'let') {
                // [let v1 e1 v2 e2 body] -> [let v1 e1 [let v2 e2 body]]
                if (exp.length > 4) exp = ['let', exp[1], exp[2], ['let'].concat(exp.slice(3))];
            } else if (head === 'set') {
                // [set v1 [...] v2 [...]] ->
                //   [let $1 [set v1 nil v2 nil] [let $2 [...] [let $3 [...] [set v1 $2 v2 $3]]]]
                var syms = {},
                    needsWrap = false;
                for (var i = 1; i < exp.length; i += 2) if (Array.isArray(exp[i + 1])) needsWrap = syms[i + 1] = exp[i + 1];
                if (needsWrap) {
                    wrap(exp.map(function (e, i) {
                        return syms[i] ? null : e;
                    }));
                    exp = exp.map(function (e, i) {
                        return syms[i] ? wrap(syms[i]) : e;
                    });
                }
            } else {
                // [cexp cexp1] -> [let $1 cexp1 [let $2 cexp2 [$1 $2]]]
                if (Array.isArray(exp[0])) exp[0] = wrap(exp[0]);
                // all the arguments must be wrapped because they may change when evaluating
                for (var i = 1; i < exp.length; i++) exp[i] = wrap(exp[i]);
            }

        exp = exp.map(anf);
        wrapper.reverse().forEach(function (pair) {
            exp = ['let', pair[0], anf(pair[1]), exp];
        });
        return exp;
    }

    function stmt(exp) {
        if (Array.isArray(exp)) {
            exp = exp.map(stmt);
            exp.isStatement = true;
        }
        return exp;
    }

    function run(exp, env, kont) {
        exp = anf(exp);
        exp = stmt(exp);

        var state = [exp, env, kont];
        while (state[0] && state[0].isStatement || state[2]) state = step.apply(null, state);
        return state[0];
    }

    run.environment = environment;

    if (typeof module !== 'undefined') module.exports = run;else if (typeof window !== 'undefined') window.evaluate = run;
})();