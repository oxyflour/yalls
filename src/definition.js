(function() {

var line = 0, col = 1
function count(value) {
	if (value === '\n')
		col = (line ++, 1)
	else
		col += value.length
}

function token(type, value, string) {
	var t = { type, value, line, col }
	count(string !== undefined ? string : value)
	return t
}

function beginStringGen(tag) {
	return function(m) {
		this.push(tag);
		this.tempString = ''
		count(m)
	}
}
function addString(m) {
	this.tempString += m
	count(m)
}
function escapeString(m) {
	this.tempString += { n:'\n', t:'\t', r:'\r'}[ m[1] ] || m[1]
	count(m)
}
function endString(m) {
	this.pop();
	return token('STR', this.tempString, m)
}

function beginCommentGen(tag) {
	return function(m) {
		this.push(tag)
		count(m)
	}
}
function eatComment(m) {
	count(m)
}
function endComment(m) {
	this.pop()
	count(m)
}
function endCommentWithNewLine(m) {
	this.pop()
	return token('NEWLINE', ';', '\n')
}

var actions = [

	[/not/,
		m => token('UNOP', m)],
	[/\^/,
		m => token('BINOP0', m)],
	[/\*|\/|%/,
		m => token('BINOP1', m)],
	[/\+|-/,
		m => token('BINOP2', m)],
	[/>=|<=|==|>|<|~=/,
		m => token('BINOP3', m)],
	[/and|or|is|as/,
		m => token('BINOP4', m)],

	[/if|elseif|then|else|func|for|do|end|return/,
		m => token(m, m)],

	[/[a-zA-Z\$_]+\d*\w*/,
		m => token('ID', m)],

	// ref: https://github.com/moescript/moescript/blob/asoi/src/compiler/lexer.js
	[/0[xX][a-fA-F0-9]+/,
		m => token('NUM', parseInt(m), m)],
	[/\d+(?:\.\d+(?:[eE]-?\d+)?)?/,
		m => token('NUM', parseFloat(m), m)],

	// strings
	[/"/,			beginStringGen('string')],
	[/\\[ntr"]/,	escapeString,	'string'],
	[/[^\\"]*/,		addString,		'string'],
	[/"/, 			endString,		'string'],
	[/'/,			beginStringGen('string1')],
	[/\\[ntr']/,	escapeString,	'string1'],
	[/[^\\']*/,		addString,		'string1'],
	[/'/, 			endString,		'string1'],

	// comments
	[/--/,			beginCommentGen('comment-sl')],
	[/[^\n]+/,		eatComment,				'comment-sl'],
	[/\n/,			endCommentWithNewLine,	'comment-sl'],
	[/--\[\[/,		beginCommentGen('comment-ml')],
	[/.*?--\]\]/,	endComment,				'comment-ml'],
	[/.*/,			eatComment,				'comment-ml'],
	[/\n/,			eatComment,				'comment-ml'],

	[/\[|{|\(|\]|}|\)|\.|=|,|\:/,
		m => token(m, m)],

	[/\n|;/,
		m => token('NEWLINE', ';', m)],

	[/[\t\r ]+/,
		m => count(m)]

]

var grammars = [

	['S', ['block']],

	['block', ['statlist']],
	['block', ['cstatlist']],

	['cstatlist', ['laststat']],
	['cstatlist', ['statlist', 'laststat'],
		(c, l) => c.concat([l])],
	['cstatlist', ['cstatlist', 'NEWLINE']],

	['statlist', ['NEWLINE'],
		(n) => ['begin']],
	['statlist', ['stat'],
		(s) => ['begin', s]],
	['statlist', ['statlist', 'stat'],
		(l, s) => l.concat([s])],
	['statlist', ['statlist', 'NEWLINE']],

	// ref: http://lua-users.org/wiki/LuaGrammar

	['laststat', ['return'],
		(_r) => null],
	// only on return value is allowed
	['laststat', ['return', 'exp'],
		(_r, e) => e],

	['stat', ['funcall']],
	['stat', ['do', 'block', 'end'],
		(_do, b, _end) => b],
//	['stat', ['while', 'exp', 'do', 'block', 'end'],
//		(_while, e, _do, b, _end) => ['while', ['lambda', i, b], e]],
	['stat', ['repetition', 'do', 'block', 'end'],
		(r, _do, b, _end) => ['for', r[1], ['lambda'].concat(r[0]).concat(b)]],
	['stat', ['if', 'conds', 'end'],
		(_if, c) => ['cond'].concat(c)],
	['stat', ['func', 'funcname', 'funcbody'],
		(_func, n, b) => ['set', n, b]],
	['stat', ['setlist', '=', 'explist'], (a, _eq, e) => {
		return a.reduce((l, i, j) => {
			// transform [set [. obj key] val] -> [set obj [. obj key val]]
			if (Array.isArray(i) && i[0] === '.') {
				l.push(i[1])
				l.push(['.', i[1], i[2], e[j]])
			}
			else {
				l.push(i)
				l.push(e[j])
			}
			return l
		}, ['set'])
	}],

	['repetition', ['for', 'ID', '=', 'explist'],
		(_for, i, _eq, e) => [[i], e.length === 1 ? e[0] : ['range'].concat(e)]],
	['repetition', ['for', 'namelist', '=', 'explist'],
		(_for, l, _eq, e) => [l, e.length === 1 ? e[0] : ['range'].concat(e)]],

	['conds', ['condlist']],
	['conds', ['condlist', 'else', 'block'],
		(l, _else, b) => l.concat([1, b])],
	['condlist', ['cond']],
	['condlist', ['condlist', 'elseif', 'cond'],
		(l, _elseif, c) => l.concat(c)],
	['cond', ['exp', 'then', 'block'],
		(e, _then, b) => [e, b]],

	// binding is the same with set
	['binding', ['local', 'namelist'],
		(_var, a) => { throw 'not implemented' }],
	['binding', ['local', 'namelist', '=', 'explist'],
		(_var, a, _eq, e) => { throw 'not implemented' }],
	['binding', ['local', 'func', 'ID', 'funcbody'],
		(_var, _func, i, f) => { throw 'not implemented' }],

	['funcname', ['dottedname']],
	['funcname', ['dottedname', ':', 'ID'],
		(p, _c, i, a) => { throw 'not implemented!' }],

	['dottedname', ['ID']],
	['dottedname', ['dottedname', '.', 'ID'],
		(n, _c, i) => ['.', n, i]],

	['namelist', ['ID'],
		(i) => [i]],
	['namelist', ['namelist', ',', 'ID'],
		(a, _c, i) => a.concat([i])],

	['explist', ['exp'],
		(e) => [e]],
	['explist', ['explist', ',', 'exp'],
		(l, _c, e) => l.concat([e])],

	['exp', ['NUM']],
	['exp', ['STR']],
	['exp', ['function']],
	['exp', ['prefix']],
	['exp', ['tableconst']],
	['exp', ['UNOP', 'exp'],
		(o, e) => [o, e]],
	['exp', ['exp', 'BINOP4', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'BINOP3', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'BINOP2', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'BINOP1', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'BINOP0', 'exp'],
		(e1, o, e2) => [o, e1, e2]],

	['setlist', ['variable'],
		(v) => [v]],
	['setlist', ['setlist', ',', 'variable'],
		(l, _c, v) => l.concat(v)],

	['variable', ['ID']],
	['variable', ['prefix', '[', 'exp', ']'],
		(p, _l, e, _r) => ['.', p, e]],
	['variable', ['prefix', '.', 'ID'],
		(p, _dot, i) => ['.', p, token('STR', i.value, '')]],

	['prefix', ['variable']],
	['prefix', ['funcall']],
	['prefix', ['(', 'exp', ')'],
		(_l, e, _r) => e],

	['funcall', ['prefix', 'args'],
		(p, a) => [p].concat(a)],
	['funcall', ['prefix', ':', 'ID', 'args'],
		(p, _c, i, a) => [':', p, token('STR', i.value)].concat(a)],

	['args', ['(', ')'],
		(a) => [ ]],
	['args', ['(', 'explist', ')'],
		(_l, a, _r) => a],
	['args', ['tableconst']],
	['args', ['STR']],

	['function', ['func', 'funcbody'],
		(_f, b) => b],
	['funcbody', ['params', 'block', 'end'],
		(p, b) => ['lambda'].concat(p).concat([b])],

	['params', ['(', ')'],
		(p) => [ ]],
	['params', ['(', 'parlist', ')'],
		(_l, p, _r) => p],

	['parlist', ['namelist']],
	['parlist', ['...'],
		(d) => { throw 'not implemented' }],
	['parlist', ['namelist', '...'],
		(d) => { throw 'not implemented' }],

	['tableconst', ['{', '}'],
		(t) => ['dict']],
	['tableconst', ['{', 'fieldlist', '}'],
		(_l, t, _r) => ['dict'].concat(t)],
	['tableconst', ['{', 'fieldlist', ',', '}'],
		(_l, t, _c, _r) => ['dict'].concat(t)],

	['fieldlist', ['field']],
	['fieldlist', ['fieldlist', ',', 'field'],
		(l, _c, f) => l.concat(f)],

	['field', ['exp'],
		(e) => [null, e]],
	['field', ['ID', '=', 'exp'],
		(i, _eq, e) => [token('STR', i.value, ''), e]],
	['field', ['[', 'exp', ']', '=', 'exp'],
		(_l, e1, _r, _eq, e2) => [e1, e2]],

]

var precedence = {
	UNOP: [20, 'right'],
	BINOP4: [10, 'left'],
	BINOP3: [11, 'left'],
	BINOP2: [12, 'left'],
	BINOP1: [13, 'left'],
	BINOP0: [14, 'right'],
	'(': [1, 'right'],
	'=': [1, 'right'],
}

var definition = { grammars, actions, precedence }

if (typeof(module) !== 'undefined')
	module.exports = definition
else if (typeof(window) !== 'undefined')
	window.definition = definition

})()