'use strict';

(function () {

	var line = 1,
	    col = 1;
	function count(value) {
		if (value === '\n') col = (line++, 1);else col += value.length;
	}

	function token(type, value, string) {
		var t = { type: type, value: value, line: line, col: col };
		count(string !== undefined ? string : value);
		return t;
	}

	function strToken(value) {
		return { type: 'STR', value: value };
	}

	function symbol() {
		return '#g' + (symbol.index = (symbol.index || 0) + 1);
	}

	function beginStringGen(tag) {
		return function (m) {
			this.push(tag);
			this.tempString = '';
			count(m);
		};
	}
	function addString(m) {
		this.tempString += m;
		count(m);
	}
	function escapeString(m) {
		this.tempString += ({ n: '\n', t: '\t', r: '\r' })[m[1]] || m[1];
		count(m);
	}
	function endString(m) {
		this.pop();
		return token('STR', this.tempString, m);
	}

	function breakPartialString(m) {
		this.push(undefined);
		return token('BSTR', this.tempString, m);
	}
	function continuePartialString(m) {
		this.pop();
		this.tempString = '';
		count(m);
	}
	function endPartialString(m) {
		this.pop();
		return token('STR', this.tempString, m);
	}

	function beginCommentGen(tag) {
		return function (m) {
			this.push(tag);
			count(m);
		};
	}
	function eatComment(m) {
		count(m);
	}
	function endComment(m) {
		this.pop();
		count(m);
	}
	function endCommentWithNewLine(m) {
		this.pop();
		return token('NEWLINE', ';', '\n');
	}

	var actions = [

	// strings
	[/"/, beginStringGen('string')], [/\\[ntr"]/, escapeString, 'string'], [/[^\\"{]*/, addString, 'string'], [/{/, addString, 'string'], [/{{/, breakPartialString, 'string'], [/}}/, continuePartialString, '/string/'], [/"/, endPartialString, 'string'], [/'/, beginStringGen('string1')], [/\\[ntr']/, escapeString, 'string1'], [/[^\\']*/, addString, 'string1'], [/'/, endString, 'string1'],

	// continue line
	[/\.\./, beginCommentGen('continue')], [/[^\n]+/, eatComment, 'continue'], [/\n/, endComment, 'continue'],

	// comments
	[/--/, beginCommentGen('comment-sl')], [/[^\n]+/, eatComment, 'comment-sl'], [/\n/, endCommentWithNewLine, 'comment-sl'], [/--\[\[/, beginCommentGen('comment-ml')], [/-/, eatComment, 'comment-ml'], [/[^-]*/, eatComment, 'comment-ml'], [/\n/, eatComment, 'comment-ml'], [/--\]\]/, endComment, 'comment-ml'], [/not/, function (m) {
		return token('NOT', m);
	}], [/\^/, function (m) {
		return token('POW', m);
	}], [/\*|\/|%/, function (m) {
		return token('MUL', m);
	}], [/\+|-/, function (m) {
		return token('ADD', m);
	}], [/>=|<=|==|>|<|~=/, function (m) {
		return token('CMP', m);
	}], [/and|or/, function (m) {
		return token('AND', m);
	}], [/\:=|\+=|-=|\*=|\/=|%=/, function (m) {
		return token('MUT', m);
	}], [/if|elseif|then|else|let|fn|while|for|do|end|nil|local|try|catch|throw|as|is/, function (m) {
		return token(m, m);
	}], [/=>|\[|{|\(|\]|}|\)|\.|=|,|\:|\||#|@/, function (m) {
		return token(m, m);
	}], [/[a-zA-Z\$_]+\d*\w*/, function (m) {
		return token('ID', m);
	}],

	// ref: https://github.com/moescript/moescript/blob/asoi/src/compiler/lexer.js
	[/0[xX][a-fA-F0-9]+/, function (m) {
		return token('NUM', parseInt(m), m);
	}], [/\d+(?:\.\d+(?:[eE]-?\d+)?)?/, function (m) {
		return token('NUM', parseFloat(m), m);
	}], [/\n|;/, function (m) {
		return token('NEWLINE', ';', m);
	}], [/[\t\r ]+/, function (m) {
		return count(m);
	}]];

	// [let c1 e1 c2 e2 ...] -> [let c1 e1 [let c2 e2]]
	function letExp(vars, body) {
		if (vars.length < 2) return ['let', undefined, undefined, body];else if (vars.length == 2) return ['let', vars[0], vars[1], body];else return ['let', vars[0], vars[1], letExp(vars.slice(2), body)];
	}

	// convert to setExp
	function unpackExp(type, varlist, exp) {
		var sym = symbol(),
		    explist = varlist.map(function (v, i) {
			return ['.', sym, type === '{}' ? strToken(v.value) : i];
		});
		return setExp([sym].concat(varlist), [['set-env', sym, exp]].concat(explist));
	}

	// [set c1 e1 c2 e2]
	function setExp(varlist, explist) {
		var set = ['set-local'];
		// transform [set [. obj key] val] -> [set # [. obj key val]]
		varlist.forEach(function (v, i) {
			var exp = explist[i];
			Array.isArray(v) && v[0] === '.' ? set.push(symbol(), ['.', v[1], v[2], exp]) : set.push(v, exp);
		});
		return set;
	}

	// [:=/+=/-=//=/*=/%= v e]
	function mutExp(operator, v, exp) {
		var set = ['set-env'];
		if (operator.value !== ':=') exp = [operator.value[0], v, exp];
		Array.isArray(v) && v[0] === '.' ? set.push(symbol(), ['.', v[1], v[2], exp]) : set.push(v, exp);
		return set;
	}

	// [if c1 e1 c2 e2 ...] -> [if c1 e1 [if c2 e2]]
	function ifExp(conds) {
		if (conds.length <= 3) return ['if', conds[0], conds[1], conds[2]];else return ['if', conds[0], conds[1], ifExp(conds.slice(2))];
	}

	// [while cond block] ->
	function whileExp(cond, block) {
		return ['callcc', ['lambda', 'break', 'continue', ['begin', ['callcc', ['lambda', 'cc', ['set-env', 'continue', 'cc']]], ['if', cond, ['begin', block, ['continue']]]]]];
	}

	// [for iter vars block]
	function forExp(iter, vars, block) {
		var $data = symbol(),
		    $iter = symbol(),
		    $lambda = symbol(),
		    lambda = ['lambda'].concat(vars).concat([block]);
		return ['let', 'continue', 'nil', ['let', $data, 'nil', ['let', $iter, ['iterator', iter], ['let', $lambda, lambda, ['let', symbol(), ['callcc', ['lambda', 'cc', ['set-env', 'continue', 'cc']]], ['let', symbol(), ['set-env', $data, [$iter, ['named-arg', strToken('@args'), $data]]], ['if', $data, ['let', symbol(), [$lambda, ['named-arg', strToken('@args'), $data]], ['continue']]]]]]]]];
	}

	// [and/or e1 e2] -> [let # e1 [if # e2 #]]
	function andExp(operator, exp1, exp2) {
		var sym = symbol();
		if (operator.value === 'and') return ['let', sym, exp1, ['if', sym, exp2, sym]];else if (operator.value === 'or') return ['let', sym, exp1, ['if', sym, sym, exp2]];else return [operator, exp1, exp2];
	}

	// [: obj methodName arg ...] -> [let # obj [: # [. # methodName] arg ...]]
	function callMethodExp(object, methodName, args) {
		var sym = symbol(),
		    fn = ['.', sym, methodName];
		return ['let', sym, object, [fn, ['named-arg', strToken('@self'), sym]].concat(args)];
	}

	var grammars = [['S', ['block']], ['block', ['body']], ['block', ['newlines', 'body'], function (_n, b) {
		return b;
	}], ['body', ['stmt'], function (s) {
		return ['begin', s];
	}], ['body', ['stmtlist']], ['body', ['stmtlist', 'stmt'], function (l, s) {
		return l.concat([s]);
	}], ['newlines', ['NEWLINE']], ['newlines', ['newlines', 'NEWLINE']], ['stmtlist', ['stmt', 'newlines'], function (s) {
		return ['begin', s];
	}], ['stmtlist', ['stmtlist', 'stmt', 'newlines'], function (l, s) {
		return l.concat([s]);
	}], ['stmt', ['exp']], ['stmt', ['fn', 'ID', 'pars', 'block', 'end'], function (_func, i, p, b, _end) {
		return ['set-local', i, ['lambda'].concat(p).concat([b])];
	}], ['stmt', ['varlist', '=', 'explist'], function (vl, _eq, el) {
		return setExp(vl, el);
	}], ['stmt', ['varlist', '=', 'MUL', 'exp'], function (vl, _eq, _s, e) {
		return unpackExp('[]', vl, e);
	}], ['stmt', ['varlist', '=', 'MUL', 'MUL', 'exp'], function (vl, _eq, _s, __s, e) {
		return unpackExp('{}', vl, e);
	}], ['exp', ['cprim']], ['exp', ['throw', 'exp'], function (t, e) {
		return [t, e];
	}], ['exp', ['variable', 'MUT', 'exp'], function (v, o, e) {
		return mutExp(o, v, e);
	}], ['exp', ['ID', '=>', 'exp'], function (p, _a, b) {
		return ['lambda'].concat(p).concat([b]);
	}], ['exp', ['(', 'idlist', ')', '=>', 'exp'], function (_l, p, _r, _a, b) {
		return ['lambda'].concat(p).concat([b]);
	}], ['cprim', ['sprim']], ['cprim', ['NOT', 'cprim'], function (o, e) {
		return [o, e];
	}], ['cprim', ['cprim', 'AND', 'cprim'], function (e1, o, e2) {
		return andExp(o, e1, e2);
	}], ['cprim', ['cprim', 'CMP', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['cprim', ['cprim', 'ADD', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['cprim', ['cprim', 'MUL', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['cprim', ['cprim', 'POW', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['sprim', ['primary']], ['sprim', ['ADD', 'primary'], function (a, p) {
		return [a, 0, p];
	}], ['primary', ['variable']], ['primary', ['cstr']], ['primary', ['literal']], ['primary', ['(', 'exp', ')'], function (_l, c, _r) {
		return c;
	}], ['primary', ['do', 'block', 'end'], function (_do, b, _end) {
		return [['lambda', b]];
	}], ['primary', ['let', 'binds', 'do', 'block', 'end'], function (_let, l, _do, b, _end) {
		return [['lambda', letExp(l, b)]];
	}], ['primary', ['if', 'conds', 'end'], function (_if, c) {
		return ifExp(c);
	}], ['primary', ['for', 'idlist', '=', 'iterator', 'do', 'block', 'end'], function (_for, i, _eq, t, _do, b, _end) {
		return forExp(t, i, b);
	}], ['primary', ['while', 'exp', 'do', 'block', 'end'], function (_while, e, _do, b, _end) {
		return whileExp(e, b);
	}], ['primary', ['primary', 'args'], function (f, a) {
		return f[0] === '.' ? callMethodExp(f[1], f[2], a) : [f].concat(a);
	}], ['primary', ['fn', 'pars', 'block', 'end'], function (_func, p, b, _end) {
		return ['lambda'].concat(p).concat([b]);
	}], ['primary', ['try', 'block', 'catch', 'ID', 'do', 'block', 'end'], function (_try, b, _catch, i, _do, d, _end) {
		return ['try', b, i, d];
	}], ['cstr', ['pstr', 'STR'], function (c, s) {
		return ['+', c, s];
	}], ['pstr', ['BSTR', 'exp'], function (b, e) {
		return ['+', strToken(b.value), e];
	}], ['pstr', ['pstr', 'BSTR', 'exp'], function (c, b, e) {
		return ['+', ['+', c, strToken(b.value)], e];
	}], ['idlist', ['ID'], function (v) {
		return [v];
	}], ['idlist', ['idlist', ',', 'ID'], function (l, _c, v) {
		return l.concat(v);
	}], ['explist', ['exp'], function (e) {
		return [e];
	}], ['explist', ['explist', ',', 'exp'], function (l, _c, e) {
		return l.concat([e]);
	}], ['variable', ['ID']], ['variable', ['local']], ['variable', ['local', 'ID'], function (_l, i) {
		return ['.', 'local', i];
	}], ['variable', ['primary', '[', 'exp', ']'], function (p, _l, e, _r) {
		return ['.', p, e];
	}], ['variable', ['primary', '.', 'ID'], function (p, _dot, i) {
		return ['.', p, strToken(i.value)];
	}], ['varlist', ['variable'], function (v) {
		return [v];
	}], ['varlist', ['varlist', ',', 'variable'], function (l, _c, v) {
		return l.concat([v]);
	}], ['binds', ['bindlist']], ['binds', ['bindlist', 'fieldsep']], ['bindlist', ['bind']], ['bindlist', ['bindlist', 'fieldsep', 'bind'], function (l, _sep, b) {
		return l.concat([b]);
	}], ['bind', ['ID', '=', 'exp'], function (i, _eq, e) {
		return [i, e];
	}],

	// parameters
	['pars', ['(', ')'], function (d) {
		return [];
	}], ['pars', ['(', 'idlist', ')'], function (_l, d, _r) {
		return d;
	}],

	// function args
	['args', ['(', ')'], function (d) {
		return [];
	}], ['args', ['(', 'arglist', ')'], function (_l, d, _r) {
		return d;
	}], ['args', ['(', 'arglist', 'fieldsep', ')'], function (_l, d, _r) {
		return d;
	}], ['arglist', ['arg'], function (f) {
		return [f];
	}], ['arglist', ['arglist', 'fieldsep', 'arg'], function (l, _c, f) {
		return l.concat([f]);
	}], ['arg', ['exp'], function (e) {
		return e;
	}], ['arg', ['ID', '=', 'exp'], function (i, _eq, e) {
		return ['named-arg', strToken(i.value), e];
	}], ['arg', ['STR', '=', 'exp'], function (i, _eq, e) {
		return ['named-arg', i, e];
	}],

	// for iterator
	['iterator', ['exp'], function (e) {
		return ['iterator', e];
	}], ['iterator', ['exp', ',', 'exp'], function (e1, _c, e2) {
		return ['range', e1, e2];
	}], ['iterator', ['exp', ',', 'exp', ',', 'exp'], function (e1, _c, e2, _c2, e3) {
		return ['range', e1, e2, e3];
	}],

	// if
	['conds', ['condlist']], ['conds', ['condlist', 'else', 'block'], function (l, _else, b) {
		return l.concat([1, b]);
	}], ['condlist', ['cond']], ['condlist', ['condlist', 'elseif', 'cond'], function (l, _elseif, c) {
		return l.concat(c);
	}], ['cond', ['exp', 'then', 'block'], function (e, _then, b) {
		return [e, b];
	}],

	// literal
	['literal', ['NUM']], ['literal', ['STR']], ['literal', ['nil']], ['literal', ['tableconst']], ['literal', ['arrayconst']],

	// array constructor
	['arrayconst', ['[', ']'], function (t) {
		return ['array'];
	}], ['arrayconst', ['[', 'cellist', ']'], function (_l, e, _r) {
		return ['array'].concat(e);
	}], ['arrayconst', ['[', 'cellist', 'fieldsep', ']'], function (_l, e, _r) {
		return ['array'].concat(e);
	}], ['cellist', ['exp'], function (f) {
		return [f];
	}], ['cellist', ['cellist', 'fieldsep', 'exp'], function (l, _c, f) {
		return l.concat([f]);
	}],

	// table constructor
	['tableconst', ['{', '}'], function (t) {
		return ['dict'];
	}], ['tableconst', ['{', 'fieldlist', '}'], function (_l, t, _r) {
		return ['dict'].concat(t);
	}], ['tableconst', ['{', 'fieldlist', 'fieldsep', '}'], function (_l, t, _c, _r) {
		return ['dict'].concat(t);
	}], ['fieldlist', ['field'], function (f) {
		return f;
	}], ['fieldlist', ['fieldlist', 'fieldsep', 'field'], function (l, _c, f) {
		return l.concat(f);
	}], ['fieldsep', [',']], ['fieldsep', ['NEWLINE']], ['field', ['ID'], function (i) {
		return [strToken(i.value), i];
	}], ['field', ['ID', '=', 'exp'], function (i, _eq, e) {
		return [strToken(i.value), e];
	}], ['field', ['STR', '=', 'exp'], function (i, _eq, e) {
		return [i, e];
	}], ['field', ['[', 'exp', ']', '=', 'exp'], function (_l, e1, _r, _eq, e2) {
		return [e1, e2];
	}]];

	var precedence = {
		POW: [20, 'right'],
		NOT: [14, 'right'],
		MUL: [13, 'left'],
		ADD: [12, 'left'],
		CMP: [11, 'left'],
		AND: [10, 'left'],
		// to resolve reduce confict `idlist -> ID` v.s. `variable -> ID`
		// (ID) will be always be parsed as (idlist) rather than (variable)
		')': [-1, 'left']
	};

	var yajily = typeof window !== 'undefined' ? window.yajily : require('../../yajily');

	function build() {
		return yajily.parse.build(grammars);
	}

	function recover(token) {
		if (token && token.type === 'NEWLINE') return true;
	}

	function parse(input, table) {
		line = col = 1;
		var tokens = yajily.lex(input, actions),
		    tree = yajily.parse(tokens, grammars, table, precedence, recover);
		return tree;
	}

	var grammar = { build: build, parse: parse };

	if (typeof module !== 'undefined') module.exports = grammar;else if (typeof window !== 'undefined') window.grammar = grammar;
})();