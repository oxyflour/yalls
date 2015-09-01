var babelPolyfil = require('babel/polyfill'),
	grammar = require('./build/grammar'),
	table = grammar.build()

require('fs').writeFile('./build/table.json', JSON.stringify(table))