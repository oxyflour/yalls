var babelPolyfil = require('babel-polyfill'),
	buildTable = () => require('./build').build()
module.exports = function(source) {
	this.cacheable()
	console.log('building grammar table...')
	return 'module.exports = ' + JSON.stringify(buildTable())
}