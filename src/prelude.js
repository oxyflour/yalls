(function() {

var self = {

	'new': function f(obj) {
		obj = obj || { }
		for (var k in f.arga)
			obj[k] = f.arga[k]

		obj['..'] = this
		obj['@'] = obj['@'] || this['@'] || self['@']

		return obj
	},

	'@': function(prop, value) {
		if (arguments.length > 1)
			return this[prop] = value

		var obj = this
		while (obj && !(prop in obj))
			obj = obj['..']

		// may throw 'prop not found'
		return obj && obj[prop]
	},

}

var root = {

	'nil': undefined,

	'PI': Math.PI,

	'not': (a) => !a,

	'^': (a, b) => Math.pow(a, b),

	'*': (a, b) => a * b,
	'/': (a, b) => a / b,

	'+': (a, b) => a + b,
	'-': (a, b) => a - b,

	'>': (a, b) => a > b,
	'<': (a, b) => a < b,
	'>=': (a, b) => a >= b,
	'<=': (a, b) => a <= b,
	'==': (a, b) => a === b,
	'~=': (a, b) => a !== b,

	'begin': function() {
		return arguments[arguments.length - 1]
	},

	'for': function(iterator, func) {
		var data = [ ], ret = [ ]
		while (data = iterator.apply(undefined, data))
			ret.push(func.apply(undefined, data))
		return ret
	},

	'range': function() {
		var start = 0, step = 1, end = 0,
			args = Array.prototype.slice.call(arguments)
		if (args.length === 1)
			end = args[0]
		else if (args.length === 2)
			[start, end] = args
		else if (args.length === 3)
			[start, step, end] = args
		return i => {
			i = i === undefined ? start : i + step
			if (i >= start && i < end)
				return [i]
		}
	},

	'pair': function(object) {
		var keys = Object.keys(object)
		return (v, k, i) => {
			i = i === undefined ? 0 : i + 1
			if (i >= 0 && i < keys.length) {
				k = keys[i]
				return [object[k], k, i]
			}
		}
	},

	'ipair': function(list) {
		return (v, i) => {
			i = i === undefined ? 0 : i + 1
			if (i >= 0 && i < list.length) {
				return [list[i], i]
			}
		}
	},

	'array': function() {
		return Array.prototype.slice.call(arguments)
	},

	'dict': function() {
		var data = { }
		for (var i = 0; i < arguments.length - 1; i += 2)
			data[arguments[i]] = arguments[i + 1]
		return data
	},

	'self': self,

	'.': function f(obj) {
		var fn = obj['@'] || self['@'],
			args = Array.prototype.slice.call(arguments).slice(1)
		return fn.apply2(obj, args, f.arga)
	},

	':': function f(obj, method) {
		var fn = root['.'](obj, method)
		if (!fn)
			throw 'YallsRuntime: method "' + method + '" does not exist on object ' + obj

		var args = Array.prototype.slice.call(arguments).slice(2)
		return fn.apply2(obj, args, f.arga)
	},

}

if (typeof(module) !== 'undefined')
	module.exports = root
else if (typeof(window) !== 'undefined')
	window.prelude = root

})()