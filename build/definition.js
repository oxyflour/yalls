'use strict';

(function () {

	var line = 0,
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

	var actions = [[/not/, function (m) {
		return token('UNOP', m);
	}], [/\^/, function (m) {
		return token('BINOP0', m);
	}], [/\*|\/|%/, function (m) {
		return token('BINOP1', m);
	}], [/\+|-/, function (m) {
		return token('BINOP2', m);
	}], [/>=|<=|==|>|<|~=/, function (m) {
		return token('BINOP3', m);
	}], [/and|or|is|as/, function (m) {
		return token('BINOP4', m);
	}], [/if|elseif|then|else|func|for|do|end|return/, function (m) {
		return token(m, m);
	}], [/[a-zA-Z\$_]+\d*\w*/, function (m) {
		return token('ID', m);
	}],

	// ref: https://github.com/moescript/moescript/blob/asoi/src/compiler/lexer.js
	[/0[xX][a-fA-F0-9]+/, function (m) {
		return token('NUM', parseInt(m), m);
	}], [/\d+(?:\.\d+(?:[eE]-?\d+)?)?/, function (m) {
		return token('NUM', parseFloat(m), m);
	}],

	// strings
	[/"/, beginStringGen('string')], [/\\[ntr"]/, escapeString, 'string'], [/[^\\"]*/, addString, 'string'], [/"/, endString, 'string'], [/'/, beginStringGen('string1')], [/\\[ntr']/, escapeString, 'string1'], [/[^\\']*/, addString, 'string1'], [/'/, endString, 'string1'],

	// comments
	[/--/, beginCommentGen('comment-sl')], [/[^\n]+/, eatComment, 'comment-sl'], [/\n/, endCommentWithNewLine, 'comment-sl'], [/--\[\[/, beginCommentGen('comment-ml')], [/.*?--\]\]/, endComment, 'comment-ml'], [/.*/, eatComment, 'comment-ml'], [/\n/, eatComment, 'comment-ml'], [/\[|{|\(|\]|}|\)|\.|=|,|\:/, function (m) {
		return token(m, m);
	}], [/\n|;/, function (m) {
		return token('NEWLINE', ';', m);
	}], [/[\t\r ]+/, function (m) {
		return count(m);
	}]];

	var grammars = [['S', ['block']], ['block', ['statlist']], ['block', ['cstatlist']], ['cstatlist', ['laststat']], ['cstatlist', ['statlist', 'laststat'], function (c, l) {
		return c.concat(l);
	}], ['cstatlist', ['cstatlist', 'NEWLINE']], ['statlist', ['NEWLINE'], function (n) {
		return ['begin'];
	}], ['statlist', ['stat'], function (s) {
		return ['begin', s];
	}], ['statlist', ['statlist', 'stat'], function (l, s) {
		return l.concat([s]);
	}], ['statlist', ['statlist', 'NEWLINE']],

	// ref: http://lua-users.org/wiki/LuaGrammar

	['laststat', ['return'], function (_r) {
		return null;
	}],
	// only on return value is allowed
	['laststat', ['return', 'exp'], function (_r, e) {
		return e;
	}], ['stat', ['funcall']], ['stat', ['do', 'block', 'end'], function (_do, b, _end) {
		return b;
	}],
	//	['stat', ['while', 'exp', 'do', 'block', 'end'],
	//		(_while, e, _do, b, _end) => ['while', ['lambda', i, b], e]],
	['stat', ['repetition', 'do', 'block', 'end'], function (r, _do, b, _end) {
		return ['for', r[1], ['lambda'].concat(r[0]).concat(b)];
	}], ['stat', ['if', 'conds', 'end'], function (_if, c) {
		return ['cond'].concat(c);
	}], ['stat', ['func', 'funcname', 'funcbody'], function (_func, n, b) {
		return ['set', n, b];
	}], ['stat', ['setlist', '=', 'explist'], function (a, _eq, e) {
		return a.reduce(function (l, i, j) {
			// transform [set [. obj key] val] -> [set obj [. obj key val]]
			if (Array.isArray(i) && i[0] === '.') {
				l.push(i[1]);
				l.push(['.', i[1], i[2], e[j]]);
			} else {
				l.push(i);
				l.push(e[j]);
			}
			return l;
		}, ['set']);
	}], ['repetition', ['for', 'ID', '=', 'explist'], function (_for, i, _eq, e) {
		return [[i], e.length === 1 ? e[0] : ['range'].concat(e)];
	}], ['repetition', ['for', 'namelist', '=', 'explist'], function (_for, l, _eq, e) {
		return [l, e.length === 1 ? e[0] : ['range'].concat(e)];
	}], ['conds', ['condlist']], ['conds', ['condlist', 'else', 'block'], function (l, _else, b) {
		return l.concat([1, b]);
	}], ['condlist', ['cond']], ['condlist', ['condlist', 'elseif', 'cond'], function (l, _elseif, c) {
		return l.concat(c);
	}], ['cond', ['exp', 'then', 'block'], function (e, _then, b) {
		return [e, b];
	}],

	// binding is the same with set
	['binding', ['local', 'namelist'], function (_var, a) {
		throw 'not implemented';
	}], ['binding', ['local', 'namelist', '=', 'explist'], function (_var, a, _eq, e) {
		throw 'not implemented';
	}], ['binding', ['local', 'func', 'ID', 'funcbody'], function (_var, _func, i, f) {
		throw 'not implemented';
	}], ['funcname', ['dottedname']], ['funcname', ['dottedname', ':', 'ID'], function (p, _c, i, a) {
		throw 'not implemented!';
	}], ['dottedname', ['ID']], ['dottedname', ['dottedname', '.', 'ID'], function (n, _c, i) {
		return ['.', n, i];
	}], ['namelist', ['ID'], function (i) {
		return [i];
	}], ['namelist', ['namelist', ',', 'ID'], function (a, _c, i) {
		return a.concat([i]);
	}], ['explist', ['exp'], function (e) {
		return [e];
	}], ['explist', ['explist', ',', 'exp'], function (l, _c, e) {
		return l.concat([e]);
	}], ['exp', ['NUM']], ['exp', ['STR']], ['exp', ['function']], ['exp', ['prefix']], ['exp', ['tableconst']], ['exp', ['UNOP', 'exp'], function (o, e) {
		return [o, e];
	}], ['exp', ['exp', 'BINOP4', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'BINOP3', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'BINOP2', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'BINOP1', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['exp', ['exp', 'BINOP0', 'exp'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['setlist', ['variable'], function (v) {
		return [v];
	}], ['setlist', ['setlist', ',', 'variable'], function (l, _c, v) {
		return l.concat(v);
	}], ['variable', ['ID']], ['variable', ['prefix', '[', 'exp', ']'], function (p, _l, e, _r) {
		return ['.', p, e];
	}], ['variable', ['prefix', '.', 'ID'], function (p, _dot, i) {
		return ['.', p, token('STR', i.value, '')];
	}], ['prefix', ['variable']], ['prefix', ['funcall']], ['prefix', ['(', 'exp', ')'], function (_l, e, _r) {
		return e;
	}], ['funcall', ['prefix', 'args'], function (p, a) {
		return [p].concat(a);
	}], ['funcall', ['prefix', ':', 'ID', 'args'], function (p, _c, i, a) {
		throw 'not implemented!';
	}], ['args', ['(', ')'], function (a) {
		return [];
	}], ['args', ['(', 'explist', ')'], function (_l, a, _r) {
		return a;
	}], ['args', ['tableconst']], ['args', ['STR']], ['function', ['func', 'funcbody'], function (_f, b) {
		return b;
	}], ['funcbody', ['params', 'block', 'end'], function (p, b) {
		return ['lambda'].concat(p).concat([b]);
	}], ['params', ['(', ')'], function (p) {
		return [];
	}], ['params', ['(', 'parlist', ')'], function (_l, p, _r) {
		return p;
	}], ['parlist', ['namelist']], ['parlist', ['...'], function (d) {
		throw 'not implemented';
	}], ['parlist', ['namelist', '...'], function (d) {
		throw 'not implemented';
	}], ['tableconst', ['{', '}'], function (t) {
		return ['dict'];
	}], ['tableconst', ['{', 'fieldlist', '}'], function (_l, t, _r) {
		return ['dict'].concat(t);
	}], ['tableconst', ['{', 'fieldlist', ',', '}'], function (_l, t, _c, _r) {
		return ['dict'].concat(t);
	}], ['fieldlist', ['field']], ['fieldlist', ['fieldlist', ',', 'field'], function (l, _c, f) {
		return l.concat(f);
	}], ['field', ['exp'], function (e) {
		return [null, e];
	}], ['field', ['ID', '=', 'exp'], function (i, _eq, e) {
		return [token('STR', i.value, ''), e];
	}], ['field', ['[', 'exp', ']', '=', 'exp'], function (_l, e1, _r, _eq, e2) {
		return [e1, e2];
	}]];

	var precedence = {
		UNOP: [20, 'right'],
		BINOP4: [10, 'left'],
		BINOP3: [11, 'left'],
		BINOP2: [12, 'left'],
		BINOP1: [13, 'left'],
		BINOP0: [14, 'right'],
		'(': [1, 'right'],
		'=': [1, 'right']
	};

	var definition = { grammars: grammars, actions: actions, precedence: precedence };

	if (typeof module !== 'undefined') module.exports = definition;else if (typeof window !== 'undefined') window.definition = definition;
})();