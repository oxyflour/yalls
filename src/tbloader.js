var babelPolyfil = require('babel-polyfill'),
	yalls = require('../build')
module.exports = function(source) {
	this.cacheable()
	console.log('building grammar table...')
	return 'module.exports = ' + JSON.stringify(yalls.build())
}