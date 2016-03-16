var { build, parse } = require('./src/grammar.js'),
	{ evaluate, environment, compile } = require('./src/cekvm.js'),
	buildins = require('./src/buildins.js')

// precompile the grammar table
var table = require('!./src/tbloader.js!./src/grammar.js'),
	uparse = parse
parse = src => uparse(src, table)

module.exports = { table, build, parse, compile, evaluate, environment, buildins }