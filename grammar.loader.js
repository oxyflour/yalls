var babelPolyfil = require('babel-polyfill'),
	builded = null,
	buildTable = () => builded || (builded = require('./build').build())
module.exports = function(source) {
	this.cacheable()
	console.log('building grammar table...')
	return 'module.exports = ' + JSON.stringify(buildTable())
}