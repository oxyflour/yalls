var babelPolyfil = require('babel/polyfill'),
	definition = require('./build/definition'),
	parse = require('./node_modules/yajily/build/parser'),
	table = parse.buildState(definition.grammars)

require('fs').writeFile('./build/table.json', JSON.stringify(table))