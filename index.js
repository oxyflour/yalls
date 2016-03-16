var grammar = require('./src/grammar.js'),
	table = require('!./src/tbloader.js!./src/grammar.js'),
	build = grammar.build,
	parse = src => grammar.parse(src, table),
	evaluate = require('./src/cekvm.js'),
	compile = evaluate.compile,
	environment = evaluate.environment,
	prelude = require('./src/prelude.js')

module.exports = { table, build, parse, compile, evaluate, environment, prelude }