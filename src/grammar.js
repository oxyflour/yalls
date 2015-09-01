(function() {

var line = 1, col = 1
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

	[/if|elseif|then|else|fn|while|for|do|end|and|or|nil|self/,
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

	// continue line
	[/\.\./,		beginCommentGen('continue')],
	[/[^\n]+/,		eatComment,				'continue'],
	[/\n/,			endComment,				'continue'],

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

	['block', ['body']],
	['block', ['newlines', 'body'],
		(_n, b) => b],

	['body', ['stmt'],
		(s) => ['begin', s]],
	['body', ['stmtlist']],
	['body', ['stmtlist', 'stmt'],
		(l, s) => l.concat([s])],

	['newlines', ['NEWLINE']],
	['newlines', ['newlines', 'NEWLINE']],

	['stmtlist', ['cstmt'],
		(s) => ['begin', s]],
	['stmtlist', ['stmtlist', 'cstmt'],
		(l, s) => l.concat([s])],

	['cstmt', ['stmt', 'NEWLINE']],
	['cstmt', ['cstmt', 'NEWLINE']],

	['stmt', ['exp']],
	['stmt', ['varlist', '=', 'explist'], (li, _eq, le) => {
		var set = ['set']
		li.forEach((_, i) => {
			var a = li[i], e = le[i]
			// transform [set [. obj key] val] -> [set obj [. obj key val]]
			if (Array.isArray(a) && a[0] === '.') {
				set.push(a[1])
				set.push(['.', a[1], a[2], e])
			}
			else {
				set.push(a)
				set.push(e)
			}
		})
		return set
	}],

	['varlist', ['variable'],
		(v) => [v]],
	['varlist', ['varlist', ',', 'variable'],
		(l, _c, v) => l.concat(v)],

	['idlist', ['ID'],
		(v) => [v]],
	['idlist', ['idlist', ',', 'ID'],
		(l, _c, v) => l.concat(v)],

	['explist', ['exp'],
		(e) => [e]],
	['explist', ['explist', ',', 'exp'],
		(l, _c, e) => l.concat([e])],

	['variable', ['ID']],
	['variable', ['primary', '[', 'exp', ']'],
		(p, _l, e, _r) => ['.', p, e]],
	['variable', ['primary', '.', 'ID'],
		(p, _dot, i) => ['.', p, token('STR', i.value)]],

	['exp', ['primary']],
	['exp', ['UNOP', 'exp'],
		(o, e) => [o, e]],
	['exp', ['(', 'BINOP2', 'exp', ')'],
		(_l, o, e2, _r) => [o, e2]],
	['exp', ['exp', 'BINOP3', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'BINOP2', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'BINOP1', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'BINOP0', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'and', 'exp'],
		(e1, o, e2) => ['let', '_', e1, ['cond', '_', e2, '_']]],
	['exp', ['exp', 'or', 'exp'],
		(e1, o, e2) => ['let', '_', e1, ['cond', '_', '_', e2]]],

	['primary', ['ID']],
	['primary', ['literal']],
	['primary', ['(', 'exp', ')'],
		(_l, c, _r) => c],
	['primary', ['primary', '[', 'exp', ']'],
		(p, _l, e, _r) => ['.', p, e]],
	['primary', ['primary', '.', 'ID'],
		(p, _d, i) => ['.', p, token('STR', i.value)]],
	['primary', ['do', 'block', 'end'],
		(_do, b, _end) => b],
	['primary', ['if', 'conds', 'end'],
		(_if, c) => ['cond'].concat(c)],
	['primary', ['for', 'idlist', '=', 'iterator', 'do', 'block', 'end'],
		(_for, i, _eq, t, _do, b, _end) => ['for', t, ['lambda'].concat(i).concat([b])]],
	['primary', ['while', 'exp', 'do', 'block', 'end'],
		(_while, e, _do, b, _end) => ['while', ['lambda', e], ['lambda', b]]],
	['primary', ['primary', 'args'],
		(f, a) => (f[0] === '.' ? [':', f[1], f[2]] : [f]).concat(a)],
	['primary', ['fn', 'pars', 'block', 'end'],
		(_func, p, b, _end) => ['lambda'].concat(p).concat([b])],

	// parameters
	['pars', ['(', ')'],
		(d) => [ ]],
	['pars', ['(', 'idlist', ')'],
		(_l, d, _r) => d],

	// function args
	['args', ['(', ')'],
		(d) => [ ]],
	['args', ['(', 'explist', ')'],
		(_l, d, _r) => d],

	// for iterator
	['iterator', ['exp'],
		(e) => e[0] === 'dict' ? ['pair', e] : (e[0] === 'array' ? ['ipair', e] : e)],
	['iterator', ['exp', ',', 'exp'],
		(e1, _c, e2) => ['range', e1, e2]],
	['iterator', ['exp', ',', 'exp', ',', 'exp'],
		(e1, _c, e2, _c2, e3) => ['range', e1, e2, e3]],

	// if
	['conds', ['condlist']],
	['conds', ['condlist', 'else', 'block'],
		(l, _else, b) => l.concat([1, b])],
	['condlist', ['cond']],
	['condlist', ['condlist', 'elseif', 'cond'],
		(l, _elseif, c) => l.concat(c)],
	['cond', ['exp', 'then', 'block'],
		(e, _then, b) => [e, b]],

	// literal
	['literal', ['NUM']],
	['literal', ['STR']],
	['literal', ['nil']],
	['literal', ['self']],
	['literal', ['tableconst']],
	['literal', ['arrayconst']],

	// table constructor
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
	['field', ['ID', ':', 'exp'],
		(i, _eq, e) => [token('STR', i.value, ''), e]],
	['field', ['[', 'exp', ']', ':', 'exp'],
		(_l, e1, _r, _eq, e2) => [e1, e2]],

	['arrayconst', ['[', ']'],
		(_) => ['array']],
	['arrayconst', ['[', 'explist', ']'],
		(_l, l, _r) => ['array'].concat(l)]
]

var precedence = {
	UNOP: [20, 'right'],
	BINOP3: [11, 'left'],
	BINOP2: [12, 'left'],
	BINOP1: [13, 'left'],
	BINOP0: [14, 'right'],
	and: [10, 'left'],
	or: [10, 'left'],
	'=': [2, 'right'],
	'.': [5, 'left'],
	'[': [5, 'right'],
	')': [2, 'right'],
	',': [2, 'left'],
	'NEWLINE': [1, 'left'],
}

var yajily = typeof(window) !== 'undefined' ? window.yajily : require('../../yajily')

function build() {
	return yajily.parse.build(grammars)
}

function parse(input, table) {
	line = col = 1
	var tokens = yajily.lex(input, actions),
		tree = yajily.parse(tokens, grammars, table, precedence)
	return tree
}

var grammar = { build, parse }

if (typeof(module) !== 'undefined')
	module.exports = grammar
else if (typeof(window) !== 'undefined')
	window.grammar = grammar

})()