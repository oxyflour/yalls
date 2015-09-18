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
		return token('PSTR', this.tempString, m);
	}
	function continuePartialString(m) {
		this.pop();
		this.tempString = '';
		count(m);
	}
	function endPartialString(m) {
		this.pop();
		return token('PSTR', this.tempString, m);
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
	[/--/, beginCommentGen('comment-sl')], [/[^\n]+/, eatComment, 'comment-sl'], [/\n/, endCommentWithNewLine, 'comment-sl'], [/--\[\[/, beginCommentGen('comment-ml')], [/.*?--\]\]/, endComment, 'comment-ml'], [/.*/, eatComment, 'comment-ml'], [/\n/, eatComment, 'comment-ml'], [/not/, function (m) {
		return token('NOT', m);
	}], [/\^/, function (m) {
		return token('POWER', m);
	}], [/\*|\/|%/, function (m) {
		return token('MUL', m);
	}], [/\+|-/, function (m) {
		return token('ADD', m);
	}], [/>=|<=|==|>|<|~=/, function (m) {
		return token('CMP', m);
	}], [/and|or/, function (m) {
		return token('AND', m);
	}], [/if|elseif|then|else|fn|while|for|do|end|nil|self/, function (m) {
		return token(m, m);
	}], [/[a-zA-Z\$_]+\d*\w*/, function (m) {
		return token('ID', m);
	}],

	// ref: https://github.com/moescript/moescript/blob/asoi/src/compiler/lexer.js
	[/0[xX][a-fA-F0-9]+/, function (m) {
		return token('NUM', parseInt(m), m);
	}], [/\d+(?:\.\d+(?:[eE]-?\d+)?)?/, function (m) {
		return token('NUM', parseFloat(m), m);
	}], [/\[|{|\(|\]|}|\)|\.|=|,|\:|\|/, function (m) {
		return token(m, m);
	}], [/\n|;/, function (m) {
		return token('NEWLINE', ';', m);
	}], [/[\t\r ]+/, function (m) {
		return count(m);
	}]];

	var grammars = [['S', ['block']], ['block', ['body']], ['block', ['newlines', 'body'], function (_n, b) {
		return b;
	}], ['body', ['stmt'], function (s) {
		return ['begin', s];
	}], ['body', ['stmtlist']], ['body', ['stmtlist', 'stmt'], function (l, s) {
		return l.concat([s]);
	}], ['newlines', ['NEWLINE']], ['newlines', ['newlines', 'NEWLINE']], ['stmtlist', ['cstmt'], function (s) {
		return ['begin', s];
	}], ['stmtlist', ['stmtlist', 'cstmt'], function (l, s) {
		return l.concat([s]);
	}], ['cstmt', ['stmt', 'NEWLINE']], ['cstmt', ['cstmt', 'NEWLINE']], ['stmt', ['exp']], ['stmt', ['fn', 'fnname', 'pars', 'block', 'end'], function (_func, a, p, b, _end) {
		var f = ['lambda'].concat(p).concat([b]);
		// transform [set [. obj key] val] -> [set obj [. obj key val]]
		return Array.isArray(a) && a[0] === '.' ? ['.', a[1], a[2], f] : ['set', a, f];
	}], ['stmt', ['varlist', '=', 'explist'], function (li, _eq, le) {
		var set = ['set'];
		// transform [set [. obj key] val] -> [set obj [. obj key val]]
		li.forEach(function (a, i) {
			Array.isArray(a) && a[0] === '.' ? set.push(a[1], ['.', a[1], a[2], le[i]]) : set.push(a, le[i]);
		});
		return set;
	}], ['exp', ['sprimary']],
	//	['exp', ['primary', 'explist'],
	//		(f, a) => (f[0] === '.' ? [':', f[1], f[2]] : [f]).concat(a)],
	['exp', ['NOT', 'exp'], function (o, e) {
		return [o, e];
	}], ['exp', ['exp', 'AND', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'CMP', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'ADD', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'MUL', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'POWER', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['sprimary', ['primary']], ['sprimary', ['ADD', 'primary'], function (a, p) {
		return [a, 0, p];
	}], ['primary', ['ID']], ['primary', ['literal']], ['primary', ['cstr']], ['primary', ['(', 'exp', ')'], function (_l, c, _r) {
		return c;
	}], ['primary', ['primary', '[', 'exp', ']'], function (p, _l, e, _r) {
		return ['.', p, e];
	}], ['primary', ['primary', '.', 'ID'], function (p, _d, i) {
		return ['.', p, token('STR', i.value)];
	}], ['primary', ['do', 'block', 'end'], function (_do, b, _end) {
		return ['let', b];
	}], ['primary', ['if', 'conds', 'end'], function (_if, c) {
		return ['if'].concat(c);
	}], ['primary', ['for', 'idlist', '=', 'iterator', 'do', 'block', 'end'], function (_for, i, _eq, t, _do, b, _end) {
		return ['for', t, ['lambda'].concat(i).concat([b])];
	}], ['primary', ['while', 'exp', 'do', 'block', 'end'], function (_while, e, _do, b, _end) {
		return ['while', ['lambda', e], ['lambda', b]];
	}], ['primary', ['primary', 'args'], function (f, a) {
		return f[0] === '.' ? [':', f[1], f[2]].concat(a) : [f].concat(a);
	}], ['primary', ['fn', 'pars', 'block', 'end'], function (_func, p, b, _end) {
		return ['lambda'].concat(p).concat([b]);
	}], ['primary', ['{', '|', 'idlist', '|', 'block', '}'], function (_l, _s, p, _d, b, _end) {
		return ['lambda'].concat(p).concat([b]);
	}], ['cstr', ['PSTR'], function (p) {
		return token('STR', p.value);
	}], ['cstr', ['cstr', 'exp', 'PSTR'], function (c, e, p) {
		return ['+', ['+', c, e], token('STR', p.value)];
	}], ['varlist', ['variable'], function (v) {
		return [v];
	}], ['varlist', ['varlist', ',', 'variable'], function (l, _c, v) {
		return l.concat(v);
	}], ['idlist', ['ID'], function (v) {
		return [v];
	}], ['idlist', ['idlist', ',', 'ID'], function (l, _c, v) {
		return l.concat(v);
	}], ['explist', ['exp'], function (e) {
		return [e];
	}], ['explist', ['explist', ',', 'exp'], function (l, _c, e) {
		return l.concat([e]);
	}], ['fnname', ['ID']], ['fnname', ['fnname', '[', 'exp', ']'], function (p, _l, e, _r) {
		return ['.', p, e];
	}], ['fnname', ['fnname', '.', 'ID'], function (p, _dot, i) {
		return ['.', p, token('STR', i.value)];
	}], ['variable', ['ID']], ['variable', ['primary', '[', 'exp', ']'], function (p, _l, e, _r) {
		return ['.', p, e];
	}], ['variable', ['primary', '.', 'ID'], function (p, _dot, i) {
		return ['.', p, token('STR', i.value)];
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
		return ['name=arg', token('STR', i.value), e];
	}],

	// for iterator
	['iterator', ['exp'], function (e) {
		return e[0] === 'dict' ? ['pair', e] : e[0] === 'array' ? ['ipair', e] : e;
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
	['literal', ['NUM']], ['literal', ['STR']], ['literal', ['nil']], ['literal', ['self']], ['literal', ['tableconst']], ['literal', ['arrayconst']], ['arrayconst', ['[', 'explist', ']'], function (_l, e, _r) {
		return ['array'].concat(e);
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
		return [token('STR', i.value), i];
	}], ['field', ['ID', '=', 'exp'], function (i, _eq, e) {
		return [token('STR', i.value), e];
	}], ['field', ['NUM', '=', 'exp'], function (i, _eq, e) {
		return [token('STR', i.value), e];
	}], ['field', ['STR', '=', 'exp'], function (i, _eq, e) {
		return [i, e];
	}], ['field', ['PSTR', '=', 'exp'], function (i, _eq, e) {
		return [i, e];
	}], ['field', ['[', 'exp', ']', '=', 'exp'], function (_l, e1, _r, _eq, e2) {
		return [e1, e2];
	}]];

	var precedence = {
		NOT: [20, 'right'],
		POWER: [14, 'right'],
		MUL: [13, 'left'],
		ADD: [12, 'left'],
		CMP: [11, 'left'],
		AND: [10, 'left']
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