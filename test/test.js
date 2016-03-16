var assert = require('assert'),
	babel = require('babel-polyfill'),
	fs = require('fs'),
	yalls = require('../build')

function makeRequire(file) {
	var dir = file.replace(/[^/]*$/, '')
	return function(file) {
		var path = dir + '/' + file + '.lua',
			input = fs.readFileSync(path),
			tree = yalls.parse(input),
			code = yalls.compile(tree),
			env = yalls.environment(root)

		env('require', makeRequire(path))
		env('exports', { })
		yalls.evaluate(code, env)
		return env('exports')
	}
}

var root = yalls.environment(null, yalls.buildins)
root('console', console)
root('describe', describe)
root('assert', assert)
root('it', it)

root('require', makeRequire('./test/'))('./test')
