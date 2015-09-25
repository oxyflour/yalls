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

function symbol() {
    return '#g' + (symbol.index = (symbol.index || 0) + 1)
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

function breakPartialString(m) {
	this.push(undefined)
	return token('BSTR', this.tempString, m)
}
function continuePartialString(m) {
	this.pop()
	this.tempString = ''
	count(m)
}
function endPartialString(m) {
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

	// strings
	[/"/,			beginStringGen('string')],
	[/\\[ntr"]/,	escapeString,	'string'],
	[/[^\\"{]*/,	addString,		'string'],
	[/{/, 			addString, 		'string'],
	[/{{/, 			breakPartialString, 	'string'],
	[/}}/, 			continuePartialString, 	'/string/'],
	[/"/, 			endPartialString,		'string'],

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

	[/not/,
		m => token('NOT', m)],
	[/\^/,
		m => token('POW', m)],
	[/\*|\/|%/,
		m => token('MUL', m)],
	[/\+|-/,
		m => token('ADD', m)],
	[/>=|<=|==|>|<|~=/,
		m => token('CMP', m)],
	[/and|or/,
		m => token('AND', m)],

	[/if|elseif|then|else|let|fn|while|for|do|end|nil|try|catch|throw/,
		m => token(m, m)],

	[/[a-zA-Z\$_]+\d*\w*/,
		m => token('ID', m)],

	// ref: https://github.com/moescript/moescript/blob/asoi/src/compiler/lexer.js
	[/0[xX][a-fA-F0-9]+/,
		m => token('NUM', parseInt(m), m)],
	[/\d+(?:\.\d+(?:[eE]-?\d+)?)?/,
		m => token('NUM', parseFloat(m), m)],

	[/\[|{|\(|\]|}|\)|\.|=|,|\:|\|/,
		m => token(m, m)],

	[/\n|;/,
		m => token('NEWLINE', ';', m)],

	[/[\t\r ]+/,
		m => count(m)]

]

// [let c1 e1 c2 e2 ...] -> [let c1 e1 [let c2 e2]]
function letExp(vars, body) {
	if (vars.length < 2)
		return ['let', undefined, undefined, body]
	else if (vars.length == 2)
		return ['let', vars[0], vars[1], body]
	else
		return ['let', vars[0], vars[1], letExp(vars.slice(2), body)]
}

// [if c1 e1 c2 e2 ...] -> [if c1 e1 [if c2 e2]]
function ifExp(conds) {
	if (conds.length <= 3)
		return ['if', conds[0], conds[1], conds[2]]
	else
    	return ['if', conds[0], conds[1], ifExp(conds.slice(2))]
}

// [and e1 e2] -> [let # e1 [if # e2 #]]
function andExp(operator, exp1, exp2) {
    var sym = symbol()
    if (operator.value === 'and')
	    return ['let', sym, exp1, ['if', sym, exp2, sym]]
    else if (operator.value === 'or')
	    return ['let', sym, exp1, ['if', sym, sym, exp2]]
	else
		return [operator, exp1, exp2]
}

// [: obj methodName arg ...] -> [let # obj [: # [. # methodName] arg ...]]
function applyExp(object, methodName, args) {
    var sym = symbol(), fn = ['.', sym, methodName]
    return ['let', sym, object, ['apply-method', sym, fn].concat(args)]
}

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
//	['stmt', ['primary', 'explist'],
//		(f, a) => f[0] === '.' ? desugarApplyMethod(['apply-method', f[1], f].concat(a) : [f].concat(a)]),
	['stmt', ['throw', 'exp'],
		(t, e) => [t, e]],
	['stmt', ['fn', 'fnname', 'pars', 'block', 'end'], (_func, a, p, b, _end) => {
		var f = ['lambda'].concat(p).concat([b])
		// transform [set [. obj key] val] -> [set obj [. obj key val]]
		return Array.isArray(a) && a[0] === '.' ?
			['.', a[1], a[2], f] : ['set', a, f]
	}],
	['stmt', ['varlist', '=', 'explist'], (li, _eq, le) => {
		var set = ['set']
		// transform [set [. obj key] val] -> [set # [. obj key val]]
		li.forEach((a, i) => {
			Array.isArray(a) && a[0] === '.' ?
				set.push('#tmp', ['.', a[1], a[2], le[i]]) : set.push(a, le[i])
		})
		return set
	}],

	['exp', ['sprimary']],
	['exp', ['NOT', 'exp'],
		(o, e) => [o, e]],
	['exp', ['exp', '|', 'exp'],
		(e1, o, e2) => [e2, e1]],
	['exp', ['exp', 'AND', 'exp'],
		(e1, o, e2) => andExp(o, e1, e2)],
	['exp', ['exp', 'CMP', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'ADD', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'MUL', 'exp'],
		(e1, o, e2) => [o, e1, e2]],
	['exp', ['exp', 'POW', 'exp'],
		(e1, o, e2) => [o, e1, e2]],

	['sprimary', ['primary']],
	['sprimary', ['ADD', 'primary'],
		(a, p) => [a, 0, p]],

	['primary', ['ID']],
	['primary', ['cstr']],
	['primary', ['literal']],
	['primary', ['(', 'exp', ')'],
		(_l, c, _r) => c],
	['primary', ['primary', '[', 'exp', ']'],
		(p, _l, e, _r) => ['.', p, e]],
	['primary', ['primary', '.', 'ID'],
		(p, _d, i) => ['.', p, token('STR', i.value)]],
	['primary', ['do', 'block', 'end'],
		(_do, b, _end) => letExp([ ], b)],
	['primary', ['let', 'fieldlist', 'do', 'block', 'end'],
		(_let, l, _do, b, _end) => letExp(l.map((v, i) => i % 2 ? v : v.value), b)],
	['primary', ['if', 'conds', 'end'],
		(_if, c) => ifExp(c)],
	['primary', ['for', 'idlist', '=', 'iterator', 'do', 'block', 'end'],
		(_for, i, _eq, t, _do, b, _end) => ['for', t, ['lambda'].concat(i).concat([b])]],
	['primary', ['while', 'exp', 'do', 'block', 'end'],
		(_while, e, _do, b, _end) => ['while', e, b]],
	['primary', ['primary', 'args'],
		(f, a) => f[0] === '.' ? applyExp(f[1], f[2], a) : [f].concat(a)],
	['primary', ['fn', 'pars', 'block', 'end'],
		(_func, p, b, _end) => ['lambda'].concat(p).concat([b])],
	['primary', ['{', '|', 'idlist', '|', 'block', '}'],
		(_l, _s, p, _d, b, _end) => ['lambda'].concat(p).concat([b])],
	['primary', ['try', 'block', 'catch', 'ID', 'do', 'block', 'end'],
		(_try, b, _catch, i, _do, d, _end) => ['try', b, i, d]],

	['cstr', ['cstr1', 'STR'],
		(c, s) => ['+', c, s]],
	['cstr1', ['BSTR', 'exp'],
		(b, e) => ['+', token('STR', b.value), e]],
	['cstr1', ['cstr1', 'BSTR', 'exp'],
		(c, b, e) => ['+', ['+', c, token('STR', b.value)], e]],

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

	['fnname', ['ID']],
	['fnname', ['fnname', '[', 'exp', ']'],
		(p, _l, e, _r) => ['.', p, e]],
	['fnname', ['fnname', '.', 'ID'],
		(p, _dot, i) => ['.', p, token('STR', i.value)]],

	['variable', ['ID']],
	['variable', ['primary', '[', 'exp', ']'],
		(p, _l, e, _r) => ['.', p, e]],
	['variable', ['primary', '.', 'ID'],
		(p, _dot, i) => ['.', p, token('STR', i.value)]],

	// parameters
	['pars', ['(', ')'],
		(d) => [ ]],
	['pars', ['(', 'idlist', ')'],
		(_l, d, _r) => d],

	// function args
	['args', ['(', ')'],
		(d) => [ ]],
	['args', ['(', 'arglist', ')'],
		(_l, d, _r) => d],
	['args', ['(', 'arglist', 'fieldsep', ')'],
		(_l, d, _r) => d],

	['arglist', ['arg'],
		(f) => [f]],
	['arglist', ['arglist', 'fieldsep', 'arg'],
		(l, _c, f) => l.concat([f])],

	['arg', ['exp'],
		(e) => e],
	['arg', ['ID', '=', 'exp'],
		(i, _eq, e) => ['named-arg', token('STR', i.value), e]],
	['arg', ['STR', '=', 'exp'],
		(i, _eq, e) => ['named-arg', i, e]],

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
	['literal', ['tableconst']],
	['literal', ['arrayconst']],

	// array constructor
	['arrayconst', ['[', 'explist', ']'],
		(_l, e, _r) => ['array'].concat(e)],

	// table constructor
	['tableconst', ['{', '}'],
		(t) => ['dict']],
	['tableconst', ['{', 'fieldlist', '}'],
		(_l, t, _r) => ['dict'].concat(t)],
	['tableconst', ['{', 'fieldlist', 'fieldsep', '}'],
		(_l, t, _c, _r) => ['dict'].concat(t)],

	['fieldlist', ['field'],
		(f) => f],
	['fieldlist', ['fieldlist', 'fieldsep', 'field'],
		(l, _c, f) => l.concat(f)],

	['fieldsep', [',']],
	['fieldsep', ['NEWLINE']],

	['field', ['ID'],
		(i) => [token('STR', i.value), i]],
	['field', ['ID', '=', 'exp'],
		(i, _eq, e) => [token('STR', i.value), e]],
	['field', ['STR', '=', 'exp'],
		(i, _eq, e) => [i, e]],
	['field', ['[', 'exp', ']', '=', 'exp'],
		(_l, e1, _r, _eq, e2) => [e1, e2]],
]

var precedence = {
	POW: [20, 'right'],
	NOT: [14, 'right'],
	MUL: [13, 'left'],
	ADD: [12, 'left'],
	CMP: [11, 'left'],
	AND: [10, 'left'],
	'|': [10, 'left'],
}

var yajily = typeof(window) !== 'undefined' ? window.yajily : require('../../yajily')

function build() {
	return yajily.parse.build(grammars)
}

function recover(token) {
	if (token && token.type === 'NEWLINE')
		return true
}

function parse(input, table) {
	line = col = 1
	var tokens = yajily.lex(input, actions),
		tree = yajily.parse(tokens, grammars, table, precedence, recover)
	return tree
}

var grammar = { build, parse }

if (typeof(module) !== 'undefined')
	module.exports = grammar
else if (typeof(window) !== 'undefined')
	window.grammar = grammar

})()
