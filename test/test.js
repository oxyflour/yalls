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
	babel = require('babel/polyfill'),

	grammar = require('../build/grammar'),
	evaluate = require('../build/cekvm'),
	prelude = require('../build/prelude'),
	table = require('../build/table.json'),

	input = require('fs').readFileSync('test/test.lua'),
	tree = grammar.parse(input, table),
	code = compile(tree)

var env = evaluate.environment(null, prelude)
env('describe', describe)
env('assert', assert)
env('it', it)

evaluate(code, env)
