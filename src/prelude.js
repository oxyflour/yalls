(function() {

var self = {

	$seek: function(member) {
		var object = this
		while (object && object[member] === undefined)
			object = object.$proto
		if (object)
			return object[member]
	},

	$call: function(object, member, args) {
		var fn = self.$seek.call(object, member) || self[member]
		return fn.apply(object, args)
	},

	$get: function (object, member) {
		return self.$seek.call(object, member) || self[member]
	},

	derive: function() {
		return { $proto: this }
	},

	print: function() {
		console.log(this)
	},

}

var root = {

	'nil': null,

	'PI': Math.PI,

	'^': (a, b) => Math.pow(a, b),

	'*': (a, b) => a * b,
	'/': (a, b) => a / b,

	'+': (a, b) => a + b,
	'-': (a, b) => a - b,

	'>': (a, b) => a > b,
	'<': (a, b) => a < b,
	'=': (a, b) => a == b,
	'>=': (a, b) => a >= b,
	'<=': (a, b) => a <= b,
	'==': (a, b) => a === b,

	'begin': function() {
		return arguments[arguments.length - 1]
	},

	'while': function(test, func) {
		var ret
		while (test())
			ret = func()
		return ret
	},

	'for': function(iterator, func) {
		var data = [ ], ret = [ ]
		while (data = iterator.apply(null, data))
			ret.push(func.apply(null, data))
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
		var k = [ ], v = [ ], d = { }, j = 0
		for (var i = 0; i < arguments.length; i += 2) {
			var x = arguments[i],
				y = arguments[i + 1]
			k.push(x)
			v.push(y)
			d[ x !== null ? x : (j++) ] = y
		}
		return k.every(i => i === null) ? v : d
	},

	'self': self,

	'.': function(o, k, v) {
		return arguments.length > 2 ?
			(o[k] = v, o) : self.$get.call(o, o, k)
	},

	':': function(o, k) {
		return self.$call.call(o, o, k,
			Array.prototype.slice.call(arguments).slice(2))
	},

}

if (typeof(module) !== 'undefined')
	module.exports = root
else if (typeof(window) !== 'undefined')
	window.predule = root

})()
