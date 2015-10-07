var assert = require('assert'),
	babel = require('babel/polyfill'),
	fs = require('fs'),

	grammar = require('../build/grammar'),
	evaluate = require('../build/cekvm'),
	prelude = require('../build/prelude'),
	table = require('../build/table.json')

function makeRequire(file) {
	var dir = file.replace(/[^/]*$/, '')
	return function(file) {
		var path = dir + '/' + file + '.lua',
			input = fs.readFileSync(path),
			tree = grammar.parse(input, table),
			code = evaluate.compile(tree),
			env = evaluate.environment(root)

		env('require', makeRequire(path))
		env('@export', { })
		evaluate(code, env)
		return env('@export')
	}
}

var root = evaluate.environment(null, prelude)
root('console', console)
root('describe', describe)
root('assert', assert)
root('it', it)

root('require', makeRequire('./test/'))('./test')
