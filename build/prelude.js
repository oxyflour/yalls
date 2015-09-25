'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

(function () {

	var self = {

		'new': function f(obj) {
			obj = obj || {};
			for (var k in f.arga) obj[k] = f.arga[k];

			obj['..'] = this;
			obj['@'] = obj['@'] || this['@'] || self['@'];

			return obj;
		},

		'@': function _(prop, value) {
			if (arguments.length > 1) return this[prop] = value;

			var obj = this;
			while (obj && obj[prop] === undefined) obj = obj['..'];

			// may throw 'prop not found'
			return obj && obj[prop];
		}

	};

	var root = {

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

		'for': function _for(iterator, func) {
			var data = [],
			    ret = [];
			while (data = iterator.apply(undefined, data)) ret.push(func.apply(undefined, data));
			return ret;
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
			var keys = Object.keys(object);
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
			return Array.prototype.slice.call(arguments);
		},

		'dict': function dict() {
			var data = {};
			for (var i = 0; i < arguments.length - 1; i += 2) data[arguments[i]] = arguments[i + 1];
			return data;
		},

		'self': self,

		'.': function f(obj) {
			var fn = obj['@'] || self['@'],
			    args = Array.prototype.slice.call(arguments).slice(1);
			return fn.apply2(obj, args, f.arga);
		}

	};

	if (typeof module !== 'undefined') module.exports = root;else if (typeof window !== 'undefined') window.prelude = root;
})();