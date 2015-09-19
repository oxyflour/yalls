(function() {

var self = {

	$seek: function(member) {
		var object = this
		while (object && object[member] === undefined)
			object = object.$proto
		return (object || self)[member]
	},

	derive: function() {
		return {
			$proto: this,
			$seek: this.$seek || self.$seek
		}
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
	'=': (a, b) => a == b,
	'>=': (a, b) => a >= b,
	'<=': (a, b) => a <= b,
	'==': (a, b) => a === b,

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

	'array': function array() {
		return Array.prototype.slice.call(arguments)
	},

	'dict': function dict() {
		var data = { }
		for (var i = 0; i < arguments.length - 1; i += 2)
			data[arguments[i]] = arguments[i + 1]
		return data
	},

	'self': self,

	'.': function(o, k, v) {
		return arguments.length > 2 ?
			(o[k] = v, o) : (o && o.$seek || self.$seek).call(o, k)
	},

	':': function(o, k) {
		var fn = (o && o.$seek || self.$seek).call(o, k)
		if (!fn) throw 'Prelude: method "' + k + '" does not exist on object ' + o
		return fn.apply(o, Array.prototype.slice.call(arguments).slice(2))
	},

}

if (typeof(module) !== 'undefined')
	module.exports = root
else if (typeof(window) !== 'undefined')
	window.prelude = root

})()
