'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

(function () {

	var self = {

		'extend': function extend(obj) {
			obj = obj || {};

			obj['@proto'] = this;
			obj['@'] = obj['@'] || this['@'] || self['@'];

			var hooks = {},
			    hasHook = false;
			for (var k in extend.arga) {
				if (k[0] === '@' && k !== '@') hasHook = hooks[k] = extend.arga[k];else obj[k] = extend.arga[k];
			}

			if (hasHook) obj['@'] = prelude.hook.apply2(this, [obj['@']], hooks);

			return obj;
		},

		'@': function _(prop, value) {
			if (arguments.length > 1) return this[prop] = value;

			var obj = this;
			while (obj !== undefined && obj !== null && obj[prop] === undefined) obj = obj['@proto'];
			return obj && obj[prop];
		}

	};

	Number.prototype['@proto'] = {

		'@proto': self,

		'times': function times(fn) {
			var ret = [];
			for (var i = 0; i < this; i++) ret.push(fn ? fn(i) : i);
			return ret;
		},

		'to': function to(_to) {
			var ret = [];
			for (var i = this; i < _to; i++) ret.push(i);
			return ret;
		},

		'clamp': function clamp(from, to) {
			if (this < from) return from;else if (this > to) return to;
			return this;
		}

	};

	Array.prototype['@proto'] = {

		'@proto': self,

		'first': function first() {
			return this[0];
		},

		'last': function last() {
			return this[this.length - 1];
		},

		'each': function each(fn) {
			return this.forEach(function (i) {
				return fn(i);
			});
		}

	};

	var dictProto = {

		'@proto': self,

		'keys': function keys() {
			return Object.keys(this).filter(function (k) {
				return k[0] !== '@';
			});
		},

		'values': function values() {
			var _this = this;

			return dictProto.keys.call(this).map(function (k) {
				return _this[k];
			});
		}

	};

	var prelude = {

		'nil': undefined,

		'PI': Math.PI,

		'not': function not(a) {
			return !a;
		},

		'^': function _(a, b) {
			return Math.pow(a, b);
		},

		'*': function _(a, b) {
			return a * b;
		},
		'/': function _(a, b) {
			return a / b;
		},
		'%': function _(a, b) {
			return a % b;
		},

		'+': function _(a, b) {
			return a + b;
		},
		'-': function _(a, b) {
			return a - b;
		},

		'>': function _(a, b) {
			return a > b;
		},
		'<': function _(a, b) {
			return a < b;
		},
		'>=': function _(a, b) {
			return a >= b;
		},
		'<=': function _(a, b) {
			return a <= b;
		},
		'==': function _(a, b) {
			return a === b;
		},
		'~=': function _(a, b) {
			return a !== b;
		},

		'loop': function loop(object, func) {
			var data = [],
			    ret = [],
			    iterator = prelude.iterator(object);
			while (data = iterator.apply(undefined, data)) ret.push(func.apply(undefined, data));
			return ret;
		},

		'zip': function zip() {
			var arrays = Array.prototype.slice.call(arguments),
			    fn = zip.arga.func || prelude.array;
			return arrays[0].map(function (e, i) {
				return fn.apply(null, arrays.map(function (a) {
					return a[i];
				}));
			});
		},

		'iterator': function iterator(object) {
			if (typeof object === 'function') return object;else if (Array.isArray(object)) return prelude.ipair(object);else return prelude.pair(object);
		},

		'range': function range() {
			var start = 0,
			    step = 1,
			    end = 0,
			    args = Array.prototype.slice.call(arguments);
			if (args.length === 1) end = args[0];else if (args.length === 2) {
				;

				var _args = _slicedToArray(args, 2);

				start = _args[0];
				end = _args[1];
			} else if (args.length === 3) {
				;

				var _args2 = _slicedToArray(args, 3);

				start = _args2[0];
				step = _args2[1];
				end = _args2[2];
			}return function (i) {
				i = i === undefined ? start : i + step;
				if (i >= start && i < end) return [i];
			};
		},

		'pair': function pair(object) {
			var keys = dictProto.keys.call(object);
			return function (v, k, i) {
				i = i === undefined ? 0 : i + 1;
				if (i >= 0 && i < keys.length) {
					k = keys[i];
					return [object[k], k, i];
				}
			};
		},

		'ipair': function ipair(list) {
			return function (v, i) {
				i = i === undefined ? 0 : i + 1;
				if (i >= 0 && i < list.length) {
					return [list[i], i];
				}
			};
		},

		'array': function array() {
			var arr = Array.prototype.slice.call(arguments);
			if (array.arga && array.arga.size) for (var i = 0; i < array.arga.size; i++) arr[i] = arr[i];
			return arr;
		},

		'dict': function dict() {
			var dict = {};
			for (var i = 0; i < arguments.length - 1; i += 2) dict[arguments[i]] = arguments[i + 1];
			dict['@proto'] = dictProto;
			return dict;
		},

		'self': self,

		'.': function dot(obj) {
			var fn = obj['@'] || self['@'],
			    args = Array.prototype.slice.call(arguments).slice(1);
			return fn.apply2(obj, args, dot.arga);
		},

		'hook': function hook(lookup) {
			var hooks = hook.arga;
			return function (prop, value) {
				var action = arguments.length > 1 ? '@set' : '@get',
				    propAction = action + '@' + prop;
				return (hooks[propAction] || hooks[action] || lookup).apply(this, arguments);
			};
		}

	};

	if (typeof module !== 'undefined') module.exports = prelude;else if (typeof window !== 'undefined') window.prelude = prelude;
})();