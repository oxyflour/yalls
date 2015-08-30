
function compile(tree) {
	if (Array.isArray(tree))
		return tree.map(compile)
	else if (tree === undefined || tree === null)
		return 'nil'
	else if (tree.type === 'STR')
		return '"' + tree.value
	else if (tree.value !== undefined)
		return tree.value
	else
		return tree
}

var assert = require('assert'),
	babelPolyfil = require('babel/polyfill'),
	lex = require('yajily/build/lexer'),
	parse = require('yajily/build/parser'),

	definition = require('../build/definition'),
	evaluate = require('../build/interpreter'),
	table = require('../build/table.json'),

	input = require('fs').readFileSync('test/test.lua'),
	tokens = lex(input, definition.actions),
	tree = parse(tokens, definition.grammars, table, definition.precedence),
	code = compile(tree)

var env = evaluate.environment()
env('describe', describe)
env('assert', assert)
env('it', it)

evaluate(code, env)
