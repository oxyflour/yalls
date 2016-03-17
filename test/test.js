var assert = require('assert'),
	babel = require('babel-polyfill'),
	yalls = require('../build')

yalls.execModule('test/test', {
	console, describe, assert, it
})
