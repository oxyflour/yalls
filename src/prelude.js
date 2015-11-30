(function() {

var self = {

	'extend': function extend(obj) {
		obj = obj || { }

		obj['@proto'] = this
		obj['@'] = obj['@'] || this['@'] || self['@']

		var hooks = { }, hasHook = false
		for (var k in extend.arga) {
			if (k[0] === '@' && k !== '@')
				hasHook = hooks[k] = extend.arga[k]
			else
				obj[k] = extend.arga[k]
		}

		if (hasHook)
			obj['@'] = prelude.hook.apply2(this, [obj['@']], hooks)

		return obj
	},

	'@': function(prop, value) {
		if (arguments.length > 1)
			return this[prop] = value

		var obj = this
		while (obj !== undefined && obj !== null && obj[prop] === undefined)
			obj = obj['@proto']
		return obj && obj[prop]
	},

}

var numberProto = {

	'@proto': self,

	'times': function(fn) {
		var ret = [ ]
		for (var i = 0; i < this; i ++)
			ret.push(fn ? fn(i) : i)
		return ret
	},

	'to': function(to) {
		var ret = [ ]
		for (var i = this; i < to; i ++)
			ret.push(i)
		return ret
	},

	'clamp': function(from, to) {
		if (this < from)
			return from
		else if (this > to)
			return to
		return this
	},

}

var arrayProto = {

	'@proto': self,

	'first': function() {
		return this[0]
	},

	'last': function() {
		return this[this.length - 1]
	},

	'each': function(fn) {
		return this.forEach(i => fn(i))
	},

}

var dictProto = {

	'@proto': self,

	'keys': function() {
		return Object.keys(this).filter(k => k[0] !== '@')
	},

	'values': function() {
		return dictProto.keys.call(this).map(k => this[k])
	},

}

var prelude = {

	'nil': undefined,

	'PI': Math.PI,

	'not': (a) => !a,

	'^': (a, b) => Math.pow(a, b),

	'*': (a, b) => a * b,
	'/': (a, b) => a / b,
	'%': (a, b) => a % b,

	'+': (a, b) => a + b,
	'-': (a, b) => a - b,

	'>': (a, b) => a > b,
	'<': (a, b) => a < b,
	'>=': (a, b) => a >= b,
	'<=': (a, b) => a <= b,
	'==': (a, b) => a === b,
	'~=': (a, b) => a !== b,

	'loop': function(object, func) {
		var data = [ ], ret = [ ],
			iterator = prelude.iterator(object)
		while (data = iterator.apply(undefined, data))
			ret.push(func.apply(undefined, data))
		return ret
	},

	'zip': function zip() {
		var arrays = Array.prototype.slice.call(arguments),
			fn = zip.arga.func || prelude.array
		return arrays[0].map(function(e, i) {
			return fn.apply(null, arrays.map(a => a[i]))
		})
	},

	'iterator': function(object) {
		if (typeof(object) === 'function')
			return object
		else if (Array.isArray(object))
			return prelude.ipair(object)
		else
			return prelude.pair(object)
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
		var keys = dictProto.keys.call(object)
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
		var arr = Array.prototype.slice.call(arguments)
		if (array.arga && array.arga.size)
			for (var i = 0; i < array.arga.size; i ++)
				arr[i] = arr[i]
		return arr
	},

	'dict': function() {
		var dict = { }
		for (var i = 0; i < arguments.length - 1; i += 2)
			dict[arguments[i]] = arguments[i + 1]
		dict['@proto'] = dictProto
		return dict
	},

	'self': self,

	'numberProto': Number.prototype['@proto'] = numberProto,
	'arrayProto': Array.prototype['@proto'] = arrayProto,
	'dictProto': dictProto,

	'.': function dot(obj) {
		var fn = obj['@'] || self['@'],
			args = Array.prototype.slice.call(arguments).slice(1)
		return fn.apply2(obj, args, dot.arga)
	},

	'hook': function hook(lookup) {
		var hooks = hook.arga
		return function(prop, value) {
			var action = arguments.length > 1 ? '@set' : '@get',
				propAction = action + '@' + prop
			return (hooks[propAction] || hooks[action] || lookup).apply(this, arguments)
		}
	}

}

if (typeof(module) !== 'undefined')
	module.exports = prelude
else if (typeof(window) !== 'undefined')
	window.prelude = prelude

})()
