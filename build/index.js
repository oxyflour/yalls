(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["yalls"] = factory();
	else
		root["yalls"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _require = __webpack_require__(1);

	var build = _require.build;
	var parse = _require.parse;

	var _require2 = __webpack_require__(5);

	var evaluate = _require2.evaluate;
	var environment = _require2.environment;
	var compile = _require2.compile;
	var buildins = __webpack_require__(6);

	var table = __webpack_require__(7),
	    uparse = parse;
	parse = function parse(src) {
		return uparse(src, table);
	};

	module.exports = { table: table, build: build, parse: parse, compile: compile, evaluate: evaluate, environment: environment, buildins: buildins };

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var yajily = __webpack_require__(2);

	var line = 1,
	    col = 1;
	function count(value) {
		if (value === '\n') col = (line++, 1);else col += value.length;
	}

	function token(type, value, string) {
		var t = { type: type, value: value, line: line, col: col };
		count(string !== undefined ? string : value);
		return t;
	}

	function strToken(value) {
		return { type: 'STR', value: value };
	}

	function symbol() {
		return '#g' + (symbol.index = (symbol.index || 0) + 1);
	}

	function beginStringGen(tag) {
		return function (m) {
			this.push(tag);
			this.tempString = '';
			count(m);
		};
	}
	function addString(m) {
		this.tempString += m;
		count(m);
	}
	function escapeString(m) {
		this.tempString += { n: '\n', t: '\t', r: '\r' }[m[1]] || m[1];
		count(m);
	}
	function endString(m) {
		this.pop();
		return token('STR', this.tempString, m);
	}

	function breakPartialString(m) {
		this.push(undefined);
		return token('BSTR', this.tempString, m);
	}
	function continuePartialString(m) {
		this.pop();
		this.tempString = '';
		count(m);
	}
	function endPartialString(m) {
		this.pop();
		return token('STR', this.tempString, m);
	}

	function beginCommentGen(tag) {
		return function (m) {
			this.push(tag);
			count(m);
		};
	}
	function eatComment(m) {
		count(m);
	}
	function endComment(m) {
		this.pop();
		count(m);
	}
	function endCommentWithNewLine(m) {
		this.pop();
		return token('NEWLINE', ';', '\n');
	}

	var actions = [

	// strings
	[/"/, beginStringGen('string')], [/\\[ntr"]/, escapeString, 'string'], [/[^\\"{]*/, addString, 'string'], [/{/, addString, 'string'], [/{{/, breakPartialString, 'string'], [/}}/, continuePartialString, '/string/'], [/"/, endPartialString, 'string'], [/'/, beginStringGen('string1')], [/\\[ntr']/, escapeString, 'string1'], [/[^\\']*/, addString, 'string1'], [/'/, endString, 'string1'],

	// continue line
	[/\.\./, beginCommentGen('continue')], [/[^\n]+/, eatComment, 'continue'], [/\n/, endComment, 'continue'],

	// comments
	[/--/, beginCommentGen('comment-sl')], [/[^\n]+/, eatComment, 'comment-sl'], [/\n/, endCommentWithNewLine, 'comment-sl'], [/--\[\[/, beginCommentGen('comment-ml')], [/-/, eatComment, 'comment-ml'], [/[^-]*/, eatComment, 'comment-ml'], [/\n/, eatComment, 'comment-ml'], [/--\]\]/, endComment, 'comment-ml'], [/not/, function (m) {
		return token('NOT', m);
	}], [/\^/, function (m) {
		return token('POW', m);
	}], [/\*|\/|%/, function (m) {
		return token('MUL', m);
	}], [/\+|-/, function (m) {
		return token('ADD', m);
	}], [/>=|<=|==|>|<|~=/, function (m) {
		return token('CMP', m);
	}], [/and|or/, function (m) {
		return token('AND', m);
	}], [/\:=|\+=|-=|\*=|\/=|%=/, function (m) {
		return token('MUT', m);
	}], [/if|elseif|then|else|let|fn|while|for|do|end|nil|local|try|catch|throw|as|is/, function (m) {
		return token(m, m);
	}], [/=>|\[|{|\(|\]|}|\)|\.|=|,|\:|\||#|@/, function (m) {
		return token(m, m);
	}], [/[a-zA-Z\$_]+\d*\w*/, function (m) {
		return token('ID', m);
	}],

	// ref: https://github.com/moescript/moescript/blob/asoi/src/compiler/lexer.js
	[/0[xX][a-fA-F0-9]+/, function (m) {
		return token('NUM', parseInt(m), m);
	}], [/\d+(?:\.\d+(?:[eE]-?\d+)?)?/, function (m) {
		return token('NUM', parseFloat(m), m);
	}], [/\n|;/, function (m) {
		return token('NEWLINE', ';', m);
	}], [/[\t\r ]+/, function (m) {
		return count(m);
	}]];

	// [let c1 e1 c2 e2 ...] -> [let c1 e1 [let c2 e2]]
	function letExp(vars, body) {
		if (vars.length < 2) return ['let', undefined, undefined, body];else if (vars.length == 2) return ['let', vars[0], vars[1], body];else return ['let', vars[0], vars[1], letExp(vars.slice(2), body)];
	}

	// convert to setExp
	function unpackExp(type, varlist, exp) {
		var sym = symbol(),
		    explist = varlist.map(function (v, i) {
			return ['.', sym, type === '{}' ? strToken(v.value) : i];
		});
		return setExp([sym].concat(varlist), [['set-env', sym, exp]].concat(explist));
	}

	// [set c1 e1 c2 e2]
	function setExp(varlist, explist) {
		var set = ['set-local'];
		// transform [set [. obj key] val] -> [set # [. obj key val]]
		varlist.forEach(function (v, i) {
			var exp = explist[i];
			Array.isArray(v) && v[0] === '.' ? set.push(symbol(), ['.', v[1], v[2], exp]) : set.push(v, exp);
		});
		return set;
	}

	// [:=/+=/-=//=/*=/%= v e]
	function mutExp(operator, v, exp) {
		var set = ['set-env'];
		if (operator.value !== ':=') exp = [operator.value[0], v, exp];
		Array.isArray(v) && v[0] === '.' ? set.push(symbol(), ['.', v[1], v[2], exp]) : set.push(v, exp);
		return set;
	}

	// [if c1 e1 c2 e2 ...] -> [if c1 e1 [if c2 e2]]
	function ifExp(conds) {
		if (conds.length <= 3) return ['if', conds[0], conds[1], conds[2]];else return ['if', conds[0], conds[1], ifExp(conds.slice(2))];
	}

	// [while cond block] ->
	function whileExp(cond, block) {
		return ['callcc', ['lambda', 'break', 'continue', ['begin', ['callcc', ['lambda', 'cc', ['set-env', 'continue', 'cc']]], ['if', cond, ['begin', block, ['continue']]]]]];
	}

	// [for iter vars block]
	function forExp(iter, vars, block) {
		var $data = symbol(),
		    $iter = symbol(),
		    $lambda = symbol(),
		    lambda = ['lambda'].concat(vars).concat([block]);
		return ['let', 'continue', 'nil', ['let', $data, 'nil', ['let', $iter, ['iterator', iter], ['let', $lambda, lambda, ['let', symbol(), ['callcc', ['lambda', 'cc', ['set-env', 'continue', 'cc']]], ['let', symbol(), ['set-env', $data, [$iter, ['named-arg', strToken('@args'), $data]]], ['if', $data, ['let', symbol(), [$lambda, ['named-arg', strToken('@args'), $data]], ['continue']]]]]]]]];
	}

	// [and/or e1 e2] -> [let # e1 [if # e2 #]]
	function andExp(operator, exp1, exp2) {
		var sym = symbol();
		if (operator.value === 'and') return ['let', sym, exp1, ['if', sym, exp2, sym]];else if (operator.value === 'or') return ['let', sym, exp1, ['if', sym, sym, exp2]];else return [operator, exp1, exp2];
	}

	// [: obj methodName arg ...] -> [let # obj [: # [. # methodName] arg ...]]
	function callMethodExp(object, methodName, args) {
		var sym = symbol(),
		    fn = ['.', sym, methodName];
		return ['let', sym, object, [fn, ['named-arg', strToken('@self'), sym]].concat(args)];
	}

	var grammars = [['S', ['block']], ['block', ['body']], ['block', ['newlines', 'body'], function (_n, b) {
		return b;
	}], ['body', ['stmt'], function (s) {
		return ['begin', s];
	}], ['body', ['stmtlist']], ['body', ['stmtlist', 'stmt'], function (l, s) {
		return l.concat([s]);
	}], ['newlines', ['NEWLINE']], ['newlines', ['newlines', 'NEWLINE']], ['stmtlist', ['stmt', 'newlines'], function (s) {
		return ['begin', s];
	}], ['stmtlist', ['stmtlist', 'stmt', 'newlines'], function (l, s) {
		return l.concat([s]);
	}], ['stmt', ['exp']], ['stmt', ['fn', 'ID', 'pars', 'block', 'end'], function (_func, i, p, b, _end) {
		return ['set-local', i, ['lambda'].concat(p).concat([b])];
	}], ['stmt', ['varlist', '=', 'explist'], function (vl, _eq, el) {
		return setExp(vl, el);
	}], ['stmt', ['varlist', '=', 'MUL', 'exp'], function (vl, _eq, _s, e) {
		return unpackExp('[]', vl, e);
	}], ['stmt', ['varlist', '=', 'MUL', 'MUL', 'exp'], function (vl, _eq, _s, __s, e) {
		return unpackExp('{}', vl, e);
	}], ['exp', ['cprim']], ['exp', ['throw', 'exp'], function (t, e) {
		return [t, e];
	}], ['exp', ['variable', 'MUT', 'exp'], function (v, o, e) {
		return mutExp(o, v, e);
	}], ['exp', ['ID', '=>', 'exp'], function (p, _a, b) {
		return ['lambda'].concat(p).concat([b]);
	}], ['exp', ['(', 'idlist', ')', '=>', 'exp'], function (_l, p, _r, _a, b) {
		return ['lambda'].concat(p).concat([b]);
	}], ['cprim', ['sprim']], ['cprim', ['NOT', 'cprim'], function (o, e) {
		return [o, e];
	}], ['cprim', ['cprim', 'AND', 'cprim'], function (e1, o, e2) {
		return andExp(o, e1, e2);
	}], ['cprim', ['cprim', 'CMP', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['cprim', ['cprim', 'ADD', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['cprim', ['cprim', 'MUL', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['cprim', ['cprim', 'POW', 'cprim'], function (e1, o, e2) {
		return [o, e1, e2];
	}], ['sprim', ['primary']], ['sprim', ['ADD', 'primary'], function (a, p) {
		return [a, 0, p];
	}], ['primary', ['variable']], ['primary', ['cstr']], ['primary', ['literal']], ['primary', ['(', 'exp', ')'], function (_l, c, _r) {
		return c;
	}], ['primary', ['do', 'block', 'end'], function (_do, b, _end) {
		return [['lambda', b]];
	}], ['primary', ['let', 'binds', 'do', 'block', 'end'], function (_let, l, _do, b, _end) {
		return [['lambda', letExp(l, b)]];
	}], ['primary', ['if', 'conds', 'end'], function (_if, c) {
		return ifExp(c);
	}], ['primary', ['for', 'idlist', '=', 'iterator', 'do', 'block', 'end'], function (_for, i, _eq, t, _do, b, _end) {
		return forExp(t, i, b);
	}], ['primary', ['while', 'exp', 'do', 'block', 'end'], function (_while, e, _do, b, _end) {
		return whileExp(e, b);
	}], ['primary', ['primary', 'args'], function (f, a) {
		return f[0] === '.' ? callMethodExp(f[1], f[2], a) : [f].concat(a);
	}], ['primary', ['fn', 'pars', 'block', 'end'], function (_func, p, b, _end) {
		return ['lambda'].concat(p).concat([b]);
	}], ['primary', ['try', 'block', 'catch', 'ID', 'do', 'block', 'end'], function (_try, b, _catch, i, _do, d, _end) {
		return ['try', b, i, d];
	}], ['cstr', ['pstr', 'STR'], function (c, s) {
		return ['+', c, s];
	}], ['pstr', ['BSTR', 'exp'], function (b, e) {
		return ['+', strToken(b.value), e];
	}], ['pstr', ['pstr', 'BSTR', 'exp'], function (c, b, e) {
		return ['+', ['+', c, strToken(b.value)], e];
	}], ['idlist', ['ID'], function (v) {
		return [v];
	}], ['idlist', ['idlist', ',', 'ID'], function (l, _c, v) {
		return l.concat(v);
	}], ['explist', ['exp'], function (e) {
		return [e];
	}], ['explist', ['explist', ',', 'exp'], function (l, _c, e) {
		return l.concat([e]);
	}], ['variable', ['ID']], ['variable', ['local']], ['variable', ['local', 'ID'], function (_l, i) {
		return ['.', 'local', i];
	}], ['variable', ['primary', '[', 'exp', ']'], function (p, _l, e, _r) {
		return ['.', p, e];
	}], ['variable', ['primary', '.', 'ID'], function (p, _dot, i) {
		return ['.', p, strToken(i.value)];
	}], ['varlist', ['variable'], function (v) {
		return [v];
	}], ['varlist', ['varlist', ',', 'variable'], function (l, _c, v) {
		return l.concat([v]);
	}], ['binds', ['bindlist']], ['binds', ['bindlist', 'fieldsep']], ['bindlist', ['bind']], ['bindlist', ['bindlist', 'fieldsep', 'bind'], function (l, _sep, b) {
		return l.concat([b]);
	}], ['bind', ['ID', '=', 'exp'], function (i, _eq, e) {
		return [i, e];
	}],

	// parameters
	['pars', ['(', ')'], function (d) {
		return [];
	}], ['pars', ['(', 'idlist', ')'], function (_l, d, _r) {
		return d;
	}],

	// function args
	['args', ['(', ')'], function (d) {
		return [];
	}], ['args', ['(', 'arglist', ')'], function (_l, d, _r) {
		return d;
	}], ['args', ['(', 'arglist', 'fieldsep', ')'], function (_l, d, _r) {
		return d;
	}], ['arglist', ['arg'], function (f) {
		return [f];
	}], ['arglist', ['arglist', 'fieldsep', 'arg'], function (l, _c, f) {
		return l.concat([f]);
	}], ['arg', ['exp'], function (e) {
		return e;
	}], ['arg', ['ID', '=', 'exp'], function (i, _eq, e) {
		return ['named-arg', strToken(i.value), e];
	}], ['arg', ['STR', '=', 'exp'], function (i, _eq, e) {
		return ['named-arg', i, e];
	}],

	// for iterator
	['iterator', ['exp'], function (e) {
		return ['iterator', e];
	}], ['iterator', ['exp', ',', 'exp'], function (e1, _c, e2) {
		return ['range', e1, e2];
	}], ['iterator', ['exp', ',', 'exp', ',', 'exp'], function (e1, _c, e2, _c2, e3) {
		return ['range', e1, e2, e3];
	}],

	// if
	['conds', ['condlist']], ['conds', ['condlist', 'else', 'block'], function (l, _else, b) {
		return l.concat([1, b]);
	}], ['condlist', ['cond']], ['condlist', ['condlist', 'elseif', 'cond'], function (l, _elseif, c) {
		return l.concat(c);
	}], ['cond', ['exp', 'then', 'block'], function (e, _then, b) {
		return [e, b];
	}],

	// literal
	['literal', ['NUM']], ['literal', ['STR']], ['literal', ['nil']], ['literal', ['tableconst']], ['literal', ['arrayconst']],

	// array constructor
	['arrayconst', ['[', ']'], function (t) {
		return ['array'];
	}], ['arrayconst', ['[', 'cellist', ']'], function (_l, e, _r) {
		return ['array'].concat(e);
	}], ['arrayconst', ['[', 'cellist', 'fieldsep', ']'], function (_l, e, _r) {
		return ['array'].concat(e);
	}], ['cellist', ['exp'], function (f) {
		return [f];
	}], ['cellist', ['cellist', 'fieldsep', 'exp'], function (l, _c, f) {
		return l.concat([f]);
	}],

	// table constructor
	['tableconst', ['{', '}'], function (t) {
		return ['dict'];
	}], ['tableconst', ['{', 'fieldlist', '}'], function (_l, t, _r) {
		return ['dict'].concat(t);
	}], ['tableconst', ['{', 'fieldlist', 'fieldsep', '}'], function (_l, t, _c, _r) {
		return ['dict'].concat(t);
	}], ['fieldlist', ['field'], function (f) {
		return f;
	}], ['fieldlist', ['fieldlist', 'fieldsep', 'field'], function (l, _c, f) {
		return l.concat(f);
	}], ['fieldsep', [',']], ['fieldsep', ['NEWLINE']], ['field', ['ID'], function (i) {
		return [strToken(i.value), i];
	}], ['field', ['ID', '=', 'exp'], function (i, _eq, e) {
		return [strToken(i.value), e];
	}], ['field', ['STR', '=', 'exp'], function (i, _eq, e) {
		return [i, e];
	}], ['field', ['[', 'exp', ']', '=', 'exp'], function (_l, e1, _r, _eq, e2) {
		return [e1, e2];
	}]];

	var precedence = {
		POW: [20, 'right'],
		NOT: [14, 'right'],
		MUL: [13, 'left'],
		ADD: [12, 'left'],
		CMP: [11, 'left'],
		AND: [10, 'left'],
		// to resolve reduce confict `idlist -> ID` v.s. `variable -> ID`
		// (ID) will be always be parsed as (idlist) rather than (variable)
		')': [-1, 'left']
	};

	function build() {
		return yajily.parse.build(grammars);
	}

	function recover(token) {
		if (token && token.type === 'NEWLINE') return true;
	}

	function parse(input, table) {
		line = col = 1;
		var tokens = yajily.lex(input, actions),
		    tree = yajily.parse(tokens, grammars, table, precedence, recover);
		return tree;
	}

	module.exports = { build: build, parse: parse };

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.lex = __webpack_require__(3);
	exports.parse = __webpack_require__(4);

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	(function () {

		// ref: https://github.com/aaditmshah/lexer/blob/master/lexer.js
		function lex(string, rules) {

			// update rules
			rules = rules.map(function (rule) {
				var _rule = _slicedToArray(rule, 3);

				var pattern = _rule[0];
				var action = _rule[1];
				var prefix = _rule[2];
				// 'g' flag is required to use regex.lastIndex
				var flags = 'g' + (pattern.ignoreCase ? 'i' : '') + (pattern.multiline ? 'm' : '');
				pattern = new RegExp(pattern.source, flags);
				action = action || function (m) {
					return '';
				};
				return { pattern: pattern, action: action, prefix: prefix };
			});

			var stack = [];
			// return { token, length }
			function feed(string, start) {
				var prefix = stack[stack.length - 1],
				    fullPrefix = '/' + stack.join('/');
				var matches = rules.map(function (rule) {
					rule.pattern.lastIndex = start;
					var shouldMatch = rule.prefix && rule.prefix[0] === '/' ? rule.prefix === fullPrefix : rule.prefix === prefix;
					return shouldMatch && rule.pattern.exec(string);
				});
				var lengths = matches.map(function (match) {
					return match && match.index === start ? match[0].length : 0;
				});
				// get the longest match
				var index = lengths.indexOf(Math.max.apply(Math, lengths)),
				    rule = rules[index],
				    length = lengths[index];
				return rule && length > 0 && {
					token: rule.action.apply(stack, matches[index]),
					length: length
				};
			}

			var start = 0,
			    tokens = [],
			    feeded = null;
			while (start < string.length && (feeded = feed(string, start))) {
				if (feeded.token) tokens.push(feeded.token);
				start += feeded.length;
			}
			if (start < string.length) {
				throw 'unexpected character near `' + string.substr(start, start + 10) + '`!';
			}
			return tokens;
		}

		if (true) module.exports = lex;else if (typeof window !== 'undefined') (window.yajily || (window.yajily = {})).lex = lex;
	})();

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	(function () {

		function unique(array) {
			return Array.from(new Set(array));
		}

		function values(object) {
			return Object.keys(object).map(function (key) {
				return object[key];
			});
		}

		function each(object, func) {
			return Object.keys(object).map(function (k, i) {
				return func(k, object[k], i);
			});
		}

		function fix(func, data) {
			var next = func(data);
			while (next !== data) {
				next = func(data = next);
			}
		}

		function dict(keys, func) {
			var d = {};
			keys.forEach(function (k, i) {
				return d[k] = func(k, i);
			});
			return d;
		}

		function id(x) {
			return x;
		}

		function build(grammars) {

			var indexMap = {};
			grammars.forEach(function (prod, index) {
				var _prod = _slicedToArray(prod, 2);

				var symbol = _prod[0];
				var grammar = _prod[1];
				(indexMap[symbol] || (indexMap[symbol] = [])).push(index);
			});

			var nullableMap = {};
			fix(function (data) {
				grammars.forEach(function (prod) {
					var _prod2 = _slicedToArray(prod, 2);

					var symbol = _prod2[0];
					var grammar = _prod2[1];

					if (grammar.every(function (symbol) {
						return !symbol || nullableMap[symbol];
					})) nullableMap[symbol] = true;
				});
				return values(nullableMap).join(',');
			});

			var firstMap = {};
			fix(function (data) {
				grammars.forEach(function (prod) {
					var _prod3 = _slicedToArray(prod, 2);

					var symbol = _prod3[0];
					var grammar = _prod3[1];
					var set = firstMap[symbol] || (firstMap[symbol] = new Set());
					first(grammar).forEach(function (symbol) {
						return set.add(symbol);
					});
				});
				return values(firstMap).map(function (t) {
					return Array.from(t).join(',');
				}).join(',,');
			});

			function first(grammar) {
				var set = new Set();
				grammar.forEach(function (symbol, index) {
					var prev = grammar.slice(0, index);
					if (!prev.length || prev.every(function (symbol) {
						return !symbol || nullableMap[symbol];
					})) {
						if (!symbol) return;else if (!indexMap[symbol]) set.add(symbol);else if (firstMap[symbol]) Array.from(firstMap[symbol]).forEach(function (t) {
							return set.add(t);
						});
					}
				});
				return Array.from(set);
			}

			function firstCached(grammar) {
				var key = 'cache:' + grammar.join(',');
				return firstCached[key] !== undefined ? firstCached[key] : firstCached[key] = first(grammar);
			}

			function closure(item) {
				var hash = function hash(pair) {
					return pair.join(',');
				},
				    map = dict(item.map(hash), function (r, i) {
					return item[i];
				});
				fix(function (data) {
					values(map).forEach(function (pair) {
						var _pair = _slicedToArray(pair, 3);

						var index = _pair[0];
						var position = _pair[1];
						var forward = _pair[2];
						var symbol = grammars[index][1][position];
						var follow = grammars[index][1][position + 1];
						var firstSet = firstCached([follow, forward]);
						if (symbol && indexMap[symbol]) indexMap[symbol].forEach(function (index) {
							(firstSet.length ? firstSet : [undefined]).forEach(function (forward) {
								var pair = [index, 0, forward];
								map[hash(pair)] = pair;
							});
						});
					});
					return Object.keys(map).length;
				});
				return values(map);
			}

			function closureCached(item) {
				var key = 'cache:' + item.map(function (i) {
					return i.join(',');
				}).join(',,');
				return closureCached[key] !== undefined ? closureCached[key] : closureCached[key] = closure(item);
			}

			function next(item, symbol0) {
				var list = [];
				item.forEach(function (pair) {
					var _pair2 = _slicedToArray(pair, 3);

					var index = _pair2[0];
					var position = _pair2[1];
					var forward = _pair2[2];
					var symbol = grammars[index][1][position];
					if (symbol === symbol0) list.push([index, position + 1, forward]);
				});
				return closureCached(list);
			}

			function compile(grammars) {
				var hash = function hash(item) {
					return item.map(function (pair) {
						return pair.join(',');
					}).join(',,');
				},
				    init = closure([[0, 0]]),
				    states = _defineProperty({}, hash(init), init),
				    edges = {/* hash -> hash */};

				fix(function (data) {
					each(states, function (key, item, state) {
						if (edges[key]) return;
						var edge = edges[key] = {};
						var symbols = item.map(function (pair) {
							var _pair3 = _slicedToArray(pair, 3);

							var index = _pair3[0];
							var position = _pair3[1];
							var forward = _pair3[2];

							return grammars[index][1][position];
						});
						unique(symbols).forEach(function (s) {
							var nextItem = s && next(item, s);
							nextItem && (states[edge[s] = hash(nextItem)] = nextItem);
						});
					});
					return Object.keys(states).length;
				});

				return { states: states, edges: edges };
			}

			function merge(states, edges) {

				// merge states with same index and position to build LALR(1) table
				var newStates = {},
				    newKeys = {};
				each(states, function (key, item, state) {
					var newKey = unique(item.map(function (i) {
						return i[0] + ',' + i[1];
					})).sort().join(',,'),
					    newItem = newStates[newKey] || (newStates[newKey] = {});
					item.forEach(function (i) {
						return newItem[i.join(',')] = i;
					});
					newKeys[key] = newKey;
				});

				// build edges (from state index to state index)
				var newEdges = {},
				    indices = dict(Object.keys(newStates), function (key, state) {
					return state;
				});
				each(edges, function (key, edge) {
					var state = indices[newKeys[key]],
					    newEdge = newEdges[state] || (newEdges[state] = {});
					each(edge, function (symbol, key) {
						var index = indices[newKeys[key]];
						newEdge[symbol] = indexMap[symbol] ? index : 's' + index;
					});
					values(newStates[newKeys[key]]).forEach(function (i) {
						var _i = _slicedToArray(i, 3);

						var index = _i[0];
						var position = _i[1];
						var follow = _i[2];

						if (position === grammars[index][1].length) {
							var val = newEdge[follow],
							    next = 'r' + index;
							newEdge[follow] = val === undefined || val === next ? next : Array.isArray(val) ? unique(val.concat([next])) : [val, next];
						}
					});
				});

				// output info
				var rsConflicts = [],
				    rrConflicts = [];
				each(newEdges, function (state, edge) {
					each(edge, function (symbol, next) {
						if (Array.isArray(next)) {
							if (next.some(function (s) {
								return s[0] === 's';
							})) rsConflicts.push({ state: state, symbol: symbol, next: next });
							if (next.filter(function (s) {
								return s[0] === 'r';
							}).length > 1) rrConflicts.push({ state: state, symbol: symbol, next: next });
						}
					});
				});
				if (rsConflicts.length || rrConflicts.length) {
					console.warn(rsConflicts.length + ' reduce-shift and ' + (rrConflicts.length + ' reduce-reduce conflicts found'));
					var conflictGrammars = {};
					rsConflicts.concat(rrConflicts).forEach(function (info) {
						info.next.filter(function (s) {
							return s[0] === 'r';
						}).map(function (s) {
							return parseInt(s.substr(1));
						}).forEach(function (i) {
							(conflictGrammars[i] || (conflictGrammars[i] = [])).push(info.symbol);
						});
					});
					each(conflictGrammars, function (index, symbols) {
						var grammar = grammars[index];
						console.log(grammar[0] + ' -> ' + grammar[1].join(' ') + ' { ' + symbols.join(', ') + ' }');
					});
				}

				return newEdges;
			}

			var _compile = compile(grammars);

			var states = _compile.states;
			var edges = _compile.edges;

			return merge(states, edges);
		}

		function parse(tokens, grammars, edges, precedence, recoverHanlder) {
			if (tokens[tokens.length - 1] !== undefined) tokens.push(undefined);

			if (!edges) edges = build(grammars);

			var stack = [0];

			function resolve(token, states) {
				function getShiftState() {
					var s = states.filter(function (s) {
						return s[0] === 's';
					});
					return s[0];
				}
				function getReduceState() {
					var s = states.filter(function (s) {
						return s[0] === 'r';
					});
					// reduce with the grammar at first
					s.sort(function (s1, s2) {
						return parseInt(s1[1]) - parseInt(s2[1]);
					});
					return s[0];
				}
				var lastToken = {};
				stack.some(function (t, i) {
					var token = stack[stack.length - 1 - i];
					return token && precedence[token.type] && (lastToken = token);
				});
				if (precedence[lastToken.type] || precedence[token.type]) {
					var currentRule = precedence[token.type] || [0],
					    lastRule = precedence[lastToken.type] || [0];
					if (currentRule[0] > lastRule[0]) return getShiftState();else if (lastRule[0] > currentRule[0]) return getReduceState();else if (lastRule[1] === 'left') return getReduceState();else if (lastRule[1] === 'right') return getShiftState();
				}
			}

			function feed(token) {
				var state = stack[stack.length - 1],
				    action = edges[state][token && token.type];

				if (Array.isArray(action) && !(action = resolve(token, action))) {
					var l = token && token.line || 0,
					    c = token && token.col || 0;
					console.log('conflict: ');
					action = edges[state][token && token.type];
					action.filter(function (a) {
						return a[0] === 'r';
					}).forEach(function (a) {
						var index = parseInt(a.substr(1));

						var _grammars$index = _slicedToArray(grammars[index], 2);

						var symbol = _grammars$index[0];
						var grammar = _grammars$index[1];

						console.log('reduce grammar ' + index + ': ' + symbol + ' -> ' + grammar.join(' '));
					});
					action.filter(function (a) {
						return a[0] === 's';
					}).forEach(function (a) {
						var state = parseInt(a.substr(1));
						console.log('shift to state ' + state);
					});
					throw ':' + l + ':' + c + ' unresolve conflict!\n' + 'token: `' + (token && token.value || token) + '` ' + (token && token.type ? '[' + token.type + '] ' : ' ');
				}

				if (!action && recoverHanlder) {
					if (recoverHanlder(token, stack, edges, feed)) return;
				}

				if (!action) {
					var l = token && token.line || 0,
					    c = token && token.col || 0;
					throw ':' + l + ':' + c + ' syntax error!\n' + 'unexpected token: `' + (token && token.value || token) + '` ' + (token && token.type ? '[' + token.type + '] ' : ' ');
				} else if (action[0] === 's') {
					stack.push(token);
					stack.push(parseInt(action.substr(1)));
				} else if (action[0] === 'r') {
					var index = parseInt(action.substr(1)),
					    left = grammars[index][0],
					    right = grammars[index][1],
					    args = [];
					right.forEach(function (symbol) {
						stack.pop();
						args.push(stack.pop());
					});

					var reduced = (grammars[index][2] || function (a) {
						return a;
					}).apply(null, args.reverse()),
					    oldState = stack[stack.length - 1],
					    nextState = edges[oldState][left];
					stack.push(reduced);
					stack.push(nextState);
					return nextState >= 0;
				}
			}

			tokens.forEach(function (token, index) {
				while (feed(token)) {}
			});
			return stack[1];
		}

		parse.build = build;

		if (true) module.exports = parse;else if (typeof window !== 'undefined') (window.yajily || (window.yajily = {})).parse = parse;
	})();

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	Function.prototype.apply2 = function (self, args, arga, kont) {
	    if (!this.extraArgs) this.extraArgs = [];

	    this.extraArgs.push(this.arga);
	    this.arga = arga;

	    var ret = this.apply(self, args);

	    this.arga = this.extraArgs.pop();
	    return ret;
	};

	/*
	 * CEK machine implement
	 */

	function environment(parent, local) {
	    local = local || {};
	    function env(name, value, setParent) {
	        if (arguments.length > 1) return !(name in local) && parent && setParent ? parent(name, value, setParent) : local[name] = value;else return !(name in local) && parent ? parent(name) : local[name];
	    }

	    // directly access local with 'local'
	    local.local = local;
	    // save env as '@' so that variables can be access with 'local.var'
	    local['@'] = env;
	    // allow overriding '@' of local
	    return function proxy(name, value, setParent) {
	        if (arguments.length > 1) return name[0] === '#' ? env(name, value, setParent) : local['@'](name, value, setParent);else return name[0] === '#' ? env(name) : local['@'](name);
	    };
	}

	function callenv(lambda, parent, self, args, arga) {
	    var env = environment(parent);

	    env('self', self);

	    env('args', args);
	    for (var i = 1; i < lambda.length - 1; i++) {
	        env(lambda[i], args[i - 1]);
	    }env('arga', arga || {});
	    if (arga) for (var k in arga) {
	        env(k, arga[k]);
	    }return env;
	}

	function value(exp, env) {
	    if (typeof exp === 'string') return env(exp);else if (exp && exp.yallsString !== undefined) return exp.yallsString;else return exp;
	}

	function closure(lambda, parent) {
	    var clo = function clo() {
	        var env = callenv(lambda, parent, this, arguments, clo.arga);
	        return evaluate(lambda[lambda.length - 1], env);
	    };
	    clo.yallsClosure = { lambda: lambda, parent: parent };
	    return clo;
	}

	function continuation(kont) {
	    var con = function con(value) {
	        throw 'RuntimeError: continuation can only be called from interval env';
	    };
	    con.yallsContinuation = kont;
	    return con;
	}

	function _namedArg(name, value) {
	    return { name: name, value: value, isNamedArg: true };
	}

	function prepareProc(exp, env) {
	    var self = env('self'),
	        proc = value(exp[0], env);

	    var args = [],
	        arga = {};
	    for (var i = 1; i < exp.length; i++) {
	        var e = value(exp[i], env);
	        if (e && e.isNamedArg) arga[e.name] = e.value;else args.push(e);
	    }

	    if (arga['@self'] !== undefined) {
	        self = arga['@self'];
	        delete arga['@self'];
	    }
	    if (arga['@args'] !== undefined) {
	        args = arga['@args'];
	        delete arga['@args'];
	    }

	    return { self: self, proc: proc, args: args, arga: arga };
	}

	function applyProc(self, proc, args, arga, kont) {
	    if (proc && proc.yallsClosure) {
	        var _proc$yallsClosure = proc.yallsClosure;
	        var lambda = _proc$yallsClosure.lambda;
	        var parent = _proc$yallsClosure.parent;
	        var env = callenv(lambda, parent, self, args, arga);
	        return [lambda[lambda.length - 1], env, kont];
	    } else if (proc && proc.yallsContinuation) {
	        return applyKont(proc.yallsContinuation, args[0]);
	    } else if (typeof proc === 'function') {
	        return applyKont(kont, proc.apply2(self, args, arga));
	    } else {
	        throw 'RuntimeError: ' + proc + ' is not a function!';
	    }
	}

	function applyKont(kont, value) {
	    if (kont) {
	        var _kont = _slicedToArray(kont, 4);

	        var name = _kont[0];
	        var exp = _kont[1];
	        var env = _kont[2];
	        var lastKont = _kont[3];
	        // we don't create new environment for each let
	        //env = environment(env)

	        env(name, value);
	        return [exp, env, lastKont];
	    } else {
	        return [value];
	    }
	}

	function applySet(exp, env, kont, setParent) {
	    for (var i = 1, pair = []; i < exp.length; i += 2) {
	        pair.push(exp[i], value(exp[i + 1], env));
	    }for (var i = 0, last = undefined; i < pair.length; i += 2) {
	        last = env(pair[i], pair[i + 1], setParent);
	    }return applyKont(kont, last);
	}

	function step(exp, env, kont) {
	    if (!(exp && exp.isStatement)) return applyKont(kont, value(exp, env));

	    var func = stepStmts[exp[0]] || stepStmts.apply;
	    return func(exp, env, kont);
	}

	var stepStmts = {
	    // closure
	    'lambda': function lambda(exp, env, kont) {
	        return [closure(exp, env), env, kont];
	    },
	    // let v e1 b
	    'let': function _let(exp, env, kont) {
	        return [exp[2], env, [exp[1], exp[3], env, kont]];
	    },
	    // if a e1 e2
	    'if': function _if(exp, env, kont) {
	        return [value(exp[1], env) ? exp[2] : exp[3], env, kont];
	    },
	    // set v1 a1 v2 a2 ...
	    'set-local': function setLocal(exp, env, kont) {
	        return applySet(exp, env, kont, false);
	    },
	    // set v1 a1 v2 a2 ...
	    'set-env': function setEnv(exp, env, kont) {
	        return applySet(exp, env, kont, true);
	    },
	    // if a e1 e2
	    'begin': function begin(exp, env, kont) {
	        return applyKont(kont, value(exp[exp.length - 1], env));
	    },
	    // call/cc a
	    'callcc': function callcc(exp, env, kont) {
	        var self = env('self'),
	            proc = value(exp[1], env);
	        return applyProc(self, proc, [continuation(kont)], {}, kont);
	    },
	    // name-arg name arg
	    'named-arg': function namedArg(exp, env, kont) {
	        var name = value(exp[1], env),
	            arg = value(exp[2], env);
	        return applyKont(kont, _namedArg(name, arg));
	    },
	    // fn a a ...
	    'apply': function apply(exp, env, kont) {
	        var _prepareProc = prepareProc(exp, env);

	        var self = _prepareProc.self;
	        var proc = _prepareProc.proc;
	        var args = _prepareProc.args;
	        var arga = _prepareProc.arga;

	        return applyProc(self, proc, args, arga, kont);
	    },
	    // eval compiledCode
	    'eval': function _eval(exp, env, kont) {
	        var code = value(exp[1], env);
	        return [expression(code), env, kont];
	    }
	};

	// http://matt.might.net/articles/a-normalization/
	function anf(exp) {
	    if (!Array.isArray(exp)) return exp;

	    var func = anfRules[exp[0]] || anfRules.apply,
	        wrapper = [];

	    exp = func(exp, function (exp) {
	        var sym = '#a' + (anf.index = (anf.index || 0) + 1);
	        wrapper.push([sym, exp]);
	        return sym;
	    });

	    exp = exp.map(anf);

	    wrapper.reverse().forEach(function (pair) {
	        exp = ['let', pair[0], anf(pair[1]), exp];
	    });

	    return exp;
	}

	var anfRules = {
	    // [lambda v ... b] -> [lambda v ... b]
	    'lambda': function lambda(exp, wrap) {
	        return exp;
	    },
	    // [let v e b] -> [let v e b]
	    'let': function _let(exp, wrap) {
	        return exp;
	    },
	    // [set v1 [...] v2 [...]] -> [let #0 [set v1 v1 v2 v2]
	    //                                    [let #1 [...] [let #2 [...] [set-env v1 #1 v2 #2]]]]
	    'set-local': function setLocal(exp, wrap) {
	        var syms = {},
	            needsWrap = false;
	        for (var i = 2; i < exp.length; i += 2) {
	            if (Array.isArray(exp[i])) needsWrap = syms[i] = exp[i];
	        }
	        if (needsWrap) {
	            wrap(exp.map(function (e, i) {
	                return syms[i] ? exp[i - 1] : e;
	            }));
	            exp = exp.map(function (e, i) {
	                return syms[i] ? wrap(e) : e;
	            });
	            exp[0] = 'set-env';
	        }
	        return exp;
	    },
	    // [set-env v1 [...] v2 [...]] -> [let #1 [...] [let #2 [...] [set-env v1 #1 v2 #2]]]
	    'set-env': function setEnv(exp, wrap) {
	        for (var i = 2; i < exp.length; i += 2) {
	            if (Array.isArray(exp[i])) exp[i] = wrap(exp[i]);
	        }return exp;
	    },
	    // [if [...] e1 e2] -> [let # [...] [if # e1 e2]]
	    'if': function _if(exp, wrap) {
	        if (Array.isArray(exp[1])) exp[1] = wrap(exp[1]);
	        return exp;
	    },
	    // [c c1] -> [let #1 c [let #2 c1 [#1 #2]]]
	    'apply': function apply(exp, wrap) {
	        if (Array.isArray(exp[0])) exp[0] = wrap(exp[0]);
	        // all the arguments must be wrapped because they may change when evaluating
	        for (var i = 1; i < exp.length; i++) {
	            if (Array.isArray(exp[i]) || typeof exp[i] === 'string') exp[i] = wrap(exp[i]);
	        }return exp;
	    }
	};

	function compileTree(tree) {
	    if (Array.isArray(tree)) return tree.map(compileTree);else if (tree === null || tree === undefined) return undefined;else if (tree.type === 'STR') return { yallsString: tree.value };else if (tree.value !== undefined) return tree.value;else return tree;
	}

	function expression(exp, index) {
	    if (Array.isArray(exp)) {
	        exp.forEach(expression);
	        exp.isStatement = true;
	    } else if (index === undefined) {
	        exp = ['begin', exp];
	        exp.isStatement = true;
	    }
	    return exp;
	}

	function evaluate(code, env, kont) {
	    var state = [expression(code), env, kont];
	    while (state[0] && state[0].isStatement || state[2]) {
	        state = step.apply(undefined, state);
	    }return state[0];
	}

	function compile(tree) {
	    return anf(compileTree(tree));
	}

	module.exports = { evaluate: evaluate, environment: environment, compile: compile };

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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

			if (hasHook) obj['@'] = buildins.hook.apply2(this, [obj['@']], hooks);

			return obj;
		},

		'@': function _(prop, value) {
			if (arguments.length > 1) return this[prop] = value;

			var obj = this;
			while (obj !== undefined && obj !== null && obj[prop] === undefined) {
				obj = obj['@proto'];
			}return obj !== undefined && obj !== null ? obj[prop] : undefined;
		}

	};

	Number.prototype['@proto'] = {

		'@proto': self,

		'times': function times(fn) {
			var ret = [];
			for (var i = 0; i < this; i++) {
				ret.push(fn ? fn(i) : i);
			}return ret;
		},

		'to': function to(_to) {
			var ret = [];
			for (var i = this; i < _to; i++) {
				ret.push(i);
			}return ret;
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

	var buildins = {

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
			    iterator = buildins.iterator(object);
			while (data = iterator.apply(undefined, data)) {
				ret.push(func.apply(undefined, data));
			}return ret;
		},

		'zip': function zip() {
			var arrays = Array.prototype.slice.call(arguments),
			    fn = zip.arga.func || buildins.array;
			return arrays[0].map(function (e, i) {
				return fn.apply(null, arrays.map(function (a) {
					return a[i];
				}));
			});
		},

		'iterator': function iterator(object) {
			if (typeof object === 'function') return object;else if (Array.isArray(object)) return buildins.ipair(object);else return buildins.pair(object);
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
			if (array.arga && array.arga.size) for (var i = 0; i < array.arga.size; i++) {
				arr[i] = arr[i];
			}return arr;
		},

		'dict': function dict() {
			var dict = {};
			for (var i = 0; i < arguments.length - 1; i += 2) {
				dict[arguments[i]] = arguments[i + 1];
			}dict['@proto'] = dictProto;
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

	module.exports = buildins;

/***/ },
/* 7 */
/***/ function(module, exports) {

	module.exports = {"0":{"block":1,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"1":{"undefined":"r0"},"2":{"undefined":"r1","end":"r1","catch":"r1","else":"r1","elseif":"r1"},"3":{"body":37,"NEWLINE":"s38","stmt":4,"stmtlist":5,"exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"4":{"newlines":39,"NEWLINE":"s6","undefined":"r3","end":"r3","catch":"r3","else":"r3","elseif":"r3"},"5":{"stmt":40,"exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36","undefined":"r4","end":"r4","catch":"r4","else":"r4","elseif":"r4"},"6":{"fn":"r6","throw":"r6","ID":"r6","(":"r6","local":"r6","do":"r6","let":"r6","if":"r6","for":"r6","while":"r6","try":"r6","NOT":"r6","NUM":"r6","STR":"r6","nil":"r6","ADD":"r6","BSTR":"r6","{":"r6","[":"r6","NEWLINE":"r6","undefined":"r6","end":"r6","catch":"r6","else":"r6","elseif":"r6"},"7":{"undefined":"r10","NEWLINE":"r10","end":"r10","catch":"r10","else":"r10","elseif":"r10"},"8":{"ID":"s41","pars":42,"(":"s43"},"9":{"=":"s44",",":"s45"},"10":{"AND":"s46","CMP":"s47","ADD":"s48","MUL":"s49","POW":"s50","undefined":"r15","NEWLINE":"r15",")":"r15","end":"r15","then":"r15","do":"r15","catch":"r15","STR":"r15","BSTR":"r15","]":"r15",",":"r15","else":"r15","elseif":"r15","}":"r15"},"11":{"exp":51,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"12":{"MUT":"s54","=":"r53",",":"r53","[":"r29",".":"r29","undefined":"r29","(":"r29","AND":"r29","CMP":"r29","ADD":"r29","MUL":"r29","POW":"r29","NEWLINE":"r29","end":"r29","catch":"r29","else":"r29","elseif":"r29"},"13":{"=>":"s55","MUT":"r48","=":"r48",",":"r48","[":"r48",".":"r48","undefined":"r48","(":"r48","AND":"r48","CMP":"r48","ADD":"r48","MUL":"r48","POW":"r48","NEWLINE":"r48","end":"r48","then":"r48","do":"r48","catch":"r48","STR":"r48","BSTR":"r48","]":"r48",")":"r48","else":"r48","elseif":"r48","}":"r48"},"14":{"idlist":56,"exp":57,"ID":"s58","cprim":10,"throw":"s11","variable":52,"(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"15":{"undefined":"r20","AND":"r20","CMP":"r20","ADD":"r20","MUL":"r20","POW":"r20","NEWLINE":"r20",")":"r20","end":"r20","then":"r20","do":"r20","catch":"r20","STR":"r20","BSTR":"r20","]":"r20",",":"r20","else":"r20","elseif":"r20","}":"r20"},"16":{"cprim":59,"sprim":15,"NOT":"s16","primary":18,"ADD":"s19","variable":60,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","ID":"s62","local":"s17","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"17":{"ID":"s63","MUT":"r49","=":"r49",",":"r49","[":"r49",".":"r49","undefined":"r49","(":"r49","AND":"r49","CMP":"r49","ADD":"r49","MUL":"r49","POW":"r49","NEWLINE":"r49",")":"r49","end":"r49","then":"r49","do":"r49","catch":"r49","STR":"r49","BSTR":"r49","]":"r49","else":"r49","elseif":"r49","}":"r49"},"18":{"[":"s64",".":"s65","args":66,"(":"s67","undefined":"r27","AND":"r27","CMP":"r27","ADD":"r27","MUL":"r27","POW":"r27","NEWLINE":"r27",")":"r27","end":"r27","then":"r27","do":"r27","catch":"r27","STR":"r27","BSTR":"r27","]":"r27",",":"r27","else":"r27","elseif":"r27","}":"r27"},"19":{"primary":68,"variable":60,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","ID":"s62","local":"s17","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"20":{"[":"r30",".":"r30","undefined":"r30","(":"r30","AND":"r30","CMP":"r30","ADD":"r30","MUL":"r30","POW":"r30","NEWLINE":"r30",")":"r30","end":"r30","then":"r30","do":"r30","catch":"r30","STR":"r30","BSTR":"r30","]":"r30",",":"r30","else":"r30","elseif":"r30","}":"r30"},"21":{"[":"r31",".":"r31","undefined":"r31","(":"r31","AND":"r31","CMP":"r31","ADD":"r31","MUL":"r31","POW":"r31","NEWLINE":"r31",")":"r31","end":"r31","then":"r31","do":"r31","catch":"r31","STR":"r31","BSTR":"r31","]":"r31",",":"r31","else":"r31","elseif":"r31","}":"r31"},"22":{"block":69,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"23":{"binds":70,"bindlist":71,"bind":72,"ID":"s73"},"24":{"conds":74,"condlist":75,"cond":76,"exp":77,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"25":{"idlist":78,"ID":"s79"},"26":{"exp":80,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"27":{"block":81,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"28":{"STR":"s82","BSTR":"s83"},"29":{"[":"r78",".":"r78","undefined":"r78","(":"r78","AND":"r78","CMP":"r78","ADD":"r78","MUL":"r78","POW":"r78","NEWLINE":"r78",")":"r78","end":"r78","then":"r78","do":"r78","catch":"r78","STR":"r78","BSTR":"r78","]":"r78",",":"r78","else":"r78","elseif":"r78","}":"r78"},"30":{"[":"r79",".":"r79","undefined":"r79","(":"r79","AND":"r79","CMP":"r79","ADD":"r79","MUL":"r79","POW":"r79","NEWLINE":"r79",")":"r79","end":"r79","then":"r79","do":"r79","catch":"r79","STR":"r79","BSTR":"r79","]":"r79",",":"r79","else":"r79","elseif":"r79","}":"r79"},"31":{"[":"r80",".":"r80","undefined":"r80","(":"r80","AND":"r80","CMP":"r80","ADD":"r80","MUL":"r80","POW":"r80","NEWLINE":"r80",")":"r80","end":"r80","then":"r80","do":"r80","catch":"r80","STR":"r80","BSTR":"r80","]":"r80",",":"r80","else":"r80","elseif":"r80","}":"r80"},"32":{"[":"r81",".":"r81","undefined":"r81","(":"r81","AND":"r81","CMP":"r81","ADD":"r81","MUL":"r81","POW":"r81","NEWLINE":"r81",")":"r81","end":"r81","then":"r81","do":"r81","catch":"r81","STR":"r81","BSTR":"r81","]":"r81",",":"r81","else":"r81","elseif":"r81","}":"r81"},"33":{"[":"r82",".":"r82","undefined":"r82","(":"r82","AND":"r82","CMP":"r82","ADD":"r82","MUL":"r82","POW":"r82","NEWLINE":"r82",")":"r82","end":"r82","then":"r82","do":"r82","catch":"r82","STR":"r82","BSTR":"r82","]":"r82",",":"r82","else":"r82","elseif":"r82","}":"r82"},"34":{"exp":84,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"35":{"}":"s85","fieldlist":86,"field":87,"ID":"s88","STR":"s89","[":"s90"},"36":{"]":"s91","cellist":92,"exp":93,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"37":{"undefined":"r2","end":"r2","catch":"r2","else":"r2","elseif":"r2"},"38":{"fn":"r7","throw":"r7","ID":"r7","(":"r7","local":"r7","do":"r7","let":"r7","if":"r7","for":"r7","while":"r7","try":"r7","NOT":"r7","NUM":"r7","STR":"r7","nil":"r7","ADD":"r7","BSTR":"r7","{":"r7","[":"r7","NEWLINE":"r7","undefined":"r7","end":"r7","catch":"r7","else":"r7","elseif":"r7"},"39":{"NEWLINE":"s38","undefined":"r8","fn":"r8","throw":"r8","ID":"r8","(":"r8","local":"r8","do":"r8","let":"r8","if":"r8","for":"r8","while":"r8","try":"r8","NOT":"r8","NUM":"r8","STR":"r8","nil":"r8","ADD":"r8","BSTR":"r8","{":"r8","[":"r8","end":"r8","catch":"r8","else":"r8","elseif":"r8"},"40":{"newlines":94,"NEWLINE":"s6","undefined":"r5","end":"r5","catch":"r5","else":"r5","elseif":"r5"},"41":{"pars":95,"(":"s43"},"42":{"block":96,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"43":{")":"s97","idlist":98,"ID":"s79"},"44":{"explist":99,"MUL":"s100","exp":101,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"45":{"variable":102,"ID":"s62","local":"s17","primary":103,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"46":{"cprim":104,"sprim":15,"NOT":"s16","primary":18,"ADD":"s19","variable":60,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","ID":"s62","local":"s17","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"47":{"cprim":105,"sprim":15,"NOT":"s16","primary":18,"ADD":"s19","variable":60,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","ID":"s62","local":"s17","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"48":{"cprim":106,"sprim":15,"NOT":"s16","primary":18,"ADD":"s19","variable":60,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","ID":"s62","local":"s17","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"49":{"cprim":107,"sprim":15,"NOT":"s16","primary":18,"ADD":"s19","variable":60,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","ID":"s62","local":"s17","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"50":{"cprim":108,"sprim":15,"NOT":"s16","primary":18,"ADD":"s19","variable":60,"cstr":20,"literal":21,"(":"s61","do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","ID":"s62","local":"s17","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"51":{"undefined":"r16","NEWLINE":"r16",")":"r16","end":"r16","then":"r16","do":"r16","catch":"r16","STR":"r16","BSTR":"r16","]":"r16",",":"r16","else":"r16","elseif":"r16","}":"r16"},"52":{"MUT":"s54","[":"r29",".":"r29","undefined":"r29","(":"r29","NEWLINE":"r29","AND":"r29","CMP":"r29","ADD":"r29","MUL":"r29","POW":"r29",")":"r29","then":"r29","do":"r29","STR":"r29","BSTR":"r29","]":"r29",",":"r29","end":"r29","catch":"r29","}":"r29","else":"r29","elseif":"r29"},"53":{"pars":42,"(":"s43"},"54":{"exp":109,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"55":{"exp":110,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"56":{")":"s111",",":"s112"},"57":{")":"s113"},"58":{"=>":"s55",")":["r44","r48"],",":"r44","MUT":"r48","[":"r48",".":"r48","(":"r48","AND":"r48","CMP":"r48","ADD":"r48","MUL":"r48","POW":"r48"},"59":{"AND":["s46","r21"],"CMP":["s47","r21"],"ADD":["s48","r21"],"MUL":["s49","r21"],"POW":["s50","r21"],"undefined":"r21","NEWLINE":"r21",")":"r21","end":"r21","then":"r21","do":"r21","catch":"r21","STR":"r21","BSTR":"r21","]":"r21",",":"r21","else":"r21","elseif":"r21","}":"r21"},"60":{"undefined":"r29","AND":"r29","CMP":"r29","ADD":"r29","MUL":"r29","POW":"r29","NEWLINE":"r29","(":"r29","[":"r29",".":"r29",")":"r29","end":"r29","then":"r29","do":"r29","catch":"r29","STR":"r29","BSTR":"r29","]":"r29",",":"r29","else":"r29","elseif":"r29","}":"r29"},"61":{"exp":57,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"62":{"undefined":"r48","AND":"r48","CMP":"r48","ADD":"r48","MUL":"r48","POW":"r48","NEWLINE":"r48","(":"r48","[":"r48",".":"r48","=":"r48",",":"r48",")":"r48","end":"r48","then":"r48","do":"r48","catch":"r48","STR":"r48","BSTR":"r48","]":"r48","else":"r48","elseif":"r48","}":"r48"},"63":{"MUT":"r50","=":"r50",",":"r50","[":"r50",".":"r50","undefined":"r50","(":"r50","AND":"r50","CMP":"r50","ADD":"r50","MUL":"r50","POW":"r50","NEWLINE":"r50",")":"r50","end":"r50","then":"r50","do":"r50","catch":"r50","STR":"r50","BSTR":"r50","]":"r50","else":"r50","elseif":"r50","}":"r50"},"64":{"exp":114,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"65":{"ID":"s115"},"66":{"[":"r38",".":"r38","undefined":"r38","(":"r38","AND":"r38","CMP":"r38","ADD":"r38","MUL":"r38","POW":"r38","NEWLINE":"r38",")":"r38","end":"r38","then":"r38","do":"r38","catch":"r38","STR":"r38","BSTR":"r38","]":"r38",",":"r38","else":"r38","elseif":"r38","}":"r38"},"67":{")":"s116","arglist":117,"arg":118,"exp":119,"ID":"s120","STR":"s121","cprim":10,"throw":"s11","variable":52,"(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"68":{"args":66,"[":"s64",".":"s65","(":"s67","undefined":"r28","AND":"r28","CMP":"r28","ADD":"r28","MUL":"r28","POW":"r28","NEWLINE":"r28",")":"r28","end":"r28","then":"r28","do":"r28","catch":"r28","STR":"r28","BSTR":"r28","]":"r28",",":"r28","else":"r28","elseif":"r28","}":"r28"},"69":{"end":"s122"},"70":{"do":"s123"},"71":{"fieldsep":124,",":"s125","NEWLINE":"s126","do":"r55"},"72":{"do":"r57",",":"r57","NEWLINE":"r57"},"73":{"=":"s127"},"74":{"end":"s128"},"75":{"else":"s129","elseif":"s130","end":"r73"},"76":{"end":"r75","else":"r75","elseif":"r75"},"77":{"then":"s131"},"78":{"=":"s132",",":"s112"},"79":{"=":"r44",",":"r44",")":"r44"},"80":{"do":"s133"},"81":{"catch":"s134"},"82":{"[":"r41",".":"r41","undefined":"r41","(":"r41","AND":"r41","CMP":"r41","ADD":"r41","MUL":"r41","POW":"r41","NEWLINE":"r41",")":"r41","end":"r41","then":"r41","do":"r41","catch":"r41","STR":"r41","BSTR":"r41","]":"r41",",":"r41","else":"r41","elseif":"r41","}":"r41"},"83":{"exp":135,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"84":{"STR":"r42","BSTR":"r42"},"85":{"[":"r88",".":"r88","undefined":"r88","(":"r88","AND":"r88","CMP":"r88","ADD":"r88","MUL":"r88","POW":"r88","NEWLINE":"r88",")":"r88","end":"r88","then":"r88","do":"r88","catch":"r88","STR":"r88","BSTR":"r88","]":"r88",",":"r88","else":"r88","elseif":"r88","}":"r88"},"86":{"}":"s136","fieldsep":137,",":"s125","NEWLINE":"s126"},"87":{"}":"r91",",":"r91","NEWLINE":"r91"},"88":{"=":"s138","}":"r95",",":"r95","NEWLINE":"r95"},"89":{"=":"s139"},"90":{"exp":140,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"91":{"[":"r83",".":"r83","undefined":"r83","(":"r83","AND":"r83","CMP":"r83","ADD":"r83","MUL":"r83","POW":"r83","NEWLINE":"r83",")":"r83","end":"r83","then":"r83","do":"r83","catch":"r83","STR":"r83","BSTR":"r83","]":"r83",",":"r83","else":"r83","elseif":"r83","}":"r83"},"92":{"]":"s141","fieldsep":142,",":"s125","NEWLINE":"s126"},"93":{"]":"r86",",":"r86","NEWLINE":"r86"},"94":{"NEWLINE":"s38","undefined":"r9","fn":"r9","throw":"r9","ID":"r9","(":"r9","local":"r9","do":"r9","let":"r9","if":"r9","for":"r9","while":"r9","try":"r9","NOT":"r9","NUM":"r9","STR":"r9","nil":"r9","ADD":"r9","BSTR":"r9","{":"r9","[":"r9","end":"r9","catch":"r9","else":"r9","elseif":"r9"},"95":{"block":143,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"96":{"end":"s144"},"97":{"NEWLINE":"r60","fn":"r60","throw":"r60","ID":"r60","(":"r60","local":"r60","do":"r60","let":"r60","if":"r60","for":"r60","while":"r60","try":"r60","NOT":"r60","NUM":"r60","STR":"r60","nil":"r60","ADD":"r60","BSTR":"r60","{":"r60","[":"r60"},"98":{")":"s145",",":"s112"},"99":{",":"s146","undefined":"r12","NEWLINE":"r12","end":"r12","catch":"r12","else":"r12","elseif":"r12"},"100":{"exp":147,"MUL":"s148","cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"101":{"undefined":"r46","NEWLINE":"r46",",":"r46","end":"r46","catch":"r46","else":"r46","elseif":"r46"},"102":{"=":"r54",",":"r54","[":"r29",".":"r29","(":"r29"},"103":{"[":"s64",".":"s65","args":66,"(":"s67"},"104":{"AND":["s46","r22"],"CMP":["s47","r22"],"ADD":["s48","r22"],"MUL":["s49","r22"],"POW":["s50","r22"],"undefined":"r22","NEWLINE":"r22",")":"r22","end":"r22","then":"r22","do":"r22","catch":"r22","STR":"r22","BSTR":"r22","]":"r22",",":"r22","else":"r22","elseif":"r22","}":"r22"},"105":{"AND":["s46","r23"],"CMP":["s47","r23"],"ADD":["s48","r23"],"MUL":["s49","r23"],"POW":["s50","r23"],"undefined":"r23","NEWLINE":"r23",")":"r23","end":"r23","then":"r23","do":"r23","catch":"r23","STR":"r23","BSTR":"r23","]":"r23",",":"r23","else":"r23","elseif":"r23","}":"r23"},"106":{"AND":["s46","r24"],"CMP":["s47","r24"],"ADD":["s48","r24"],"MUL":["s49","r24"],"POW":["s50","r24"],"undefined":"r24","NEWLINE":"r24",")":"r24","end":"r24","then":"r24","do":"r24","catch":"r24","STR":"r24","BSTR":"r24","]":"r24",",":"r24","else":"r24","elseif":"r24","}":"r24"},"107":{"AND":["s46","r25"],"CMP":["s47","r25"],"ADD":["s48","r25"],"MUL":["s49","r25"],"POW":["s50","r25"],"undefined":"r25","NEWLINE":"r25",")":"r25","end":"r25","then":"r25","do":"r25","catch":"r25","STR":"r25","BSTR":"r25","]":"r25",",":"r25","else":"r25","elseif":"r25","}":"r25"},"108":{"AND":["s46","r26"],"CMP":["s47","r26"],"ADD":["s48","r26"],"MUL":["s49","r26"],"POW":["s50","r26"],"undefined":"r26","NEWLINE":"r26",")":"r26","end":"r26","then":"r26","do":"r26","catch":"r26","STR":"r26","BSTR":"r26","]":"r26",",":"r26","else":"r26","elseif":"r26","}":"r26"},"109":{"undefined":"r17","NEWLINE":"r17",")":"r17","end":"r17","then":"r17","do":"r17","catch":"r17","STR":"r17","BSTR":"r17","]":"r17",",":"r17","else":"r17","elseif":"r17","}":"r17"},"110":{"undefined":"r18","NEWLINE":"r18",")":"r18","end":"r18","then":"r18","do":"r18","catch":"r18","STR":"r18","BSTR":"r18","]":"r18",",":"r18","else":"r18","elseif":"r18","}":"r18"},"111":{"=>":"s149"},"112":{"ID":"s150"},"113":{"[":"r32",".":"r32","undefined":"r32","(":"r32","AND":"r32","CMP":"r32","ADD":"r32","MUL":"r32","POW":"r32","NEWLINE":"r32",")":"r32","end":"r32","then":"r32","do":"r32","catch":"r32","STR":"r32","BSTR":"r32","]":"r32",",":"r32","else":"r32","elseif":"r32","}":"r32"},"114":{"]":"s151"},"115":{"MUT":"r52","=":"r52",",":"r52","[":"r52",".":"r52","undefined":"r52","(":"r52","AND":"r52","CMP":"r52","ADD":"r52","MUL":"r52","POW":"r52","NEWLINE":"r52",")":"r52","end":"r52","then":"r52","do":"r52","catch":"r52","STR":"r52","BSTR":"r52","]":"r52","else":"r52","elseif":"r52","}":"r52"},"116":{"[":"r62",".":"r62","undefined":"r62","(":"r62","AND":"r62","CMP":"r62","ADD":"r62","MUL":"r62","POW":"r62","NEWLINE":"r62",")":"r62","end":"r62","then":"r62","do":"r62","catch":"r62","STR":"r62","BSTR":"r62","]":"r62",",":"r62","else":"r62","elseif":"r62","}":"r62"},"117":{")":"s152","fieldsep":153,",":"s125","NEWLINE":"s126"},"118":{")":"r65",",":"r65","NEWLINE":"r65"},"119":{")":"r67",",":"r67","NEWLINE":"r67"},"120":{"=":"s154","=>":"s55","MUT":"r48","[":"r48",".":"r48",")":"r48","(":"r48",",":"r48","NEWLINE":"r48","AND":"r48","CMP":"r48","ADD":"r48","MUL":"r48","POW":"r48"},"121":{"=":"s155","[":"r79",".":"r79",")":"r79","(":"r79",",":"r79","NEWLINE":"r79","AND":"r79","CMP":"r79","ADD":"r79","MUL":"r79","POW":"r79"},"122":{"[":"r33",".":"r33","undefined":"r33","(":"r33","AND":"r33","CMP":"r33","ADD":"r33","MUL":"r33","POW":"r33","NEWLINE":"r33",")":"r33","end":"r33","then":"r33","do":"r33","catch":"r33","STR":"r33","BSTR":"r33","]":"r33",",":"r33","else":"r33","elseif":"r33","}":"r33"},"123":{"block":156,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"124":{"bind":157,"ID":"s73","do":"r56"},"125":{"do":"r93","ID":"r93","}":"r93","STR":"r93","[":"r93","]":"r93","throw":"r93","(":"r93","NOT":"r93","local":"r93","let":"r93","if":"r93","for":"r93","while":"r93","fn":"r93","try":"r93","ADD":"r93","NUM":"r93","nil":"r93","BSTR":"r93","{":"r93",")":"r93"},"126":{"do":"r94","ID":"r94","}":"r94","STR":"r94","[":"r94","]":"r94","throw":"r94","(":"r94","NOT":"r94","local":"r94","let":"r94","if":"r94","for":"r94","while":"r94","fn":"r94","try":"r94","ADD":"r94","NUM":"r94","nil":"r94","BSTR":"r94","{":"r94",")":"r94"},"127":{"exp":158,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"128":{"[":"r35",".":"r35","undefined":"r35","(":"r35","AND":"r35","CMP":"r35","ADD":"r35","MUL":"r35","POW":"r35","NEWLINE":"r35",")":"r35","end":"r35","then":"r35","do":"r35","catch":"r35","STR":"r35","BSTR":"r35","]":"r35",",":"r35","else":"r35","elseif":"r35","}":"r35"},"129":{"block":159,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"130":{"cond":160,"exp":77,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"131":{"block":161,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"132":{"iterator":162,"exp":163,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"133":{"block":164,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"134":{"ID":"s165"},"135":{"STR":"r43","BSTR":"r43"},"136":{"[":"r89",".":"r89","undefined":"r89","(":"r89","AND":"r89","CMP":"r89","ADD":"r89","MUL":"r89","POW":"r89","NEWLINE":"r89",")":"r89","end":"r89","then":"r89","do":"r89","catch":"r89","STR":"r89","BSTR":"r89","]":"r89",",":"r89","else":"r89","elseif":"r89","}":"r89"},"137":{"}":"s166","field":167,"ID":"s88","STR":"s89","[":"s90"},"138":{"exp":168,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"139":{"exp":169,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"140":{"]":"s170"},"141":{"[":"r84",".":"r84","undefined":"r84","(":"r84","AND":"r84","CMP":"r84","ADD":"r84","MUL":"r84","POW":"r84","NEWLINE":"r84",")":"r84","end":"r84","then":"r84","do":"r84","catch":"r84","STR":"r84","BSTR":"r84","]":"r84",",":"r84","else":"r84","elseif":"r84","}":"r84"},"142":{"]":"s171","exp":172,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"143":{"end":"s173"},"144":{"[":"r39",".":"r39","undefined":"r39","(":"r39","AND":"r39","CMP":"r39","ADD":"r39","MUL":"r39","POW":"r39","NEWLINE":"r39",")":"r39","end":"r39","then":"r39","do":"r39","catch":"r39","STR":"r39","BSTR":"r39","]":"r39",",":"r39","else":"r39","elseif":"r39","}":"r39"},"145":{"NEWLINE":"r61","fn":"r61","throw":"r61","ID":"r61","(":"r61","local":"r61","do":"r61","let":"r61","if":"r61","for":"r61","while":"r61","try":"r61","NOT":"r61","NUM":"r61","STR":"r61","nil":"r61","ADD":"r61","BSTR":"r61","{":"r61","[":"r61"},"146":{"exp":174,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"147":{"undefined":"r13","NEWLINE":"r13","end":"r13","catch":"r13","else":"r13","elseif":"r13"},"148":{"exp":175,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"149":{"exp":176,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"150":{")":"r45",",":"r45","=":"r45"},"151":{"MUT":"r51","=":"r51",",":"r51","[":"r51",".":"r51","undefined":"r51","(":"r51","AND":"r51","CMP":"r51","ADD":"r51","MUL":"r51","POW":"r51","NEWLINE":"r51",")":"r51","end":"r51","then":"r51","do":"r51","catch":"r51","STR":"r51","BSTR":"r51","]":"r51","else":"r51","elseif":"r51","}":"r51"},"152":{"[":"r63",".":"r63","undefined":"r63","(":"r63","AND":"r63","CMP":"r63","ADD":"r63","MUL":"r63","POW":"r63","NEWLINE":"r63",")":"r63","end":"r63","then":"r63","do":"r63","catch":"r63","STR":"r63","BSTR":"r63","]":"r63",",":"r63","else":"r63","elseif":"r63","}":"r63"},"153":{")":"s177","arg":178,"exp":119,"ID":"s120","STR":"s121","cprim":10,"throw":"s11","variable":52,"(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"154":{"exp":179,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"155":{"exp":180,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"156":{"end":"s181"},"157":{"do":"r58",",":"r58","NEWLINE":"r58"},"158":{"do":"r59",",":"r59","NEWLINE":"r59"},"159":{"end":"r74"},"160":{"end":"r76","else":"r76","elseif":"r76"},"161":{"end":"r77","else":"r77","elseif":"r77"},"162":{"do":"s182"},"163":{",":"s183","do":"r70"},"164":{"end":"s184"},"165":{"do":"s185"},"166":{"[":"r90",".":"r90","undefined":"r90","(":"r90","AND":"r90","CMP":"r90","ADD":"r90","MUL":"r90","POW":"r90","NEWLINE":"r90",")":"r90","end":"r90","then":"r90","do":"r90","catch":"r90","STR":"r90","BSTR":"r90","]":"r90",",":"r90","else":"r90","elseif":"r90","}":"r90"},"167":{"}":"r92",",":"r92","NEWLINE":"r92"},"168":{"}":"r96",",":"r96","NEWLINE":"r96"},"169":{"}":"r97",",":"r97","NEWLINE":"r97"},"170":{"=":"s186"},"171":{"[":"r85",".":"r85","undefined":"r85","(":"r85","AND":"r85","CMP":"r85","ADD":"r85","MUL":"r85","POW":"r85","NEWLINE":"r85",")":"r85","end":"r85","then":"r85","do":"r85","catch":"r85","STR":"r85","BSTR":"r85","]":"r85",",":"r85","else":"r85","elseif":"r85","}":"r85"},"172":{"]":"r87",",":"r87","NEWLINE":"r87"},"173":{"undefined":"r11","NEWLINE":"r11","end":"r11","catch":"r11","else":"r11","elseif":"r11"},"174":{"undefined":"r47","NEWLINE":"r47",",":"r47","end":"r47","catch":"r47","else":"r47","elseif":"r47"},"175":{"undefined":"r14","NEWLINE":"r14","end":"r14","catch":"r14","else":"r14","elseif":"r14"},"176":{"undefined":"r19","NEWLINE":"r19",")":"r19","end":"r19","then":"r19","do":"r19","catch":"r19","STR":"r19","BSTR":"r19","]":"r19",",":"r19","else":"r19","elseif":"r19","}":"r19"},"177":{"[":"r64",".":"r64","undefined":"r64","(":"r64","AND":"r64","CMP":"r64","ADD":"r64","MUL":"r64","POW":"r64","NEWLINE":"r64",")":"r64","end":"r64","then":"r64","do":"r64","catch":"r64","STR":"r64","BSTR":"r64","]":"r64",",":"r64","else":"r64","elseif":"r64","}":"r64"},"178":{")":"r66",",":"r66","NEWLINE":"r66"},"179":{")":"r68",",":"r68","NEWLINE":"r68"},"180":{")":"r69",",":"r69","NEWLINE":"r69"},"181":{"[":"r34",".":"r34","undefined":"r34","(":"r34","AND":"r34","CMP":"r34","ADD":"r34","MUL":"r34","POW":"r34","NEWLINE":"r34",")":"r34","end":"r34","then":"r34","do":"r34","catch":"r34","STR":"r34","BSTR":"r34","]":"r34",",":"r34","else":"r34","elseif":"r34","}":"r34"},"182":{"block":187,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"183":{"exp":188,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"184":{"[":"r37",".":"r37","undefined":"r37","(":"r37","AND":"r37","CMP":"r37","ADD":"r37","MUL":"r37","POW":"r37","NEWLINE":"r37",")":"r37","end":"r37","then":"r37","do":"r37","catch":"r37","STR":"r37","BSTR":"r37","]":"r37",",":"r37","else":"r37","elseif":"r37","}":"r37"},"185":{"block":189,"body":2,"newlines":3,"stmt":4,"stmtlist":5,"NEWLINE":"s6","exp":7,"fn":"s8","varlist":9,"cprim":10,"throw":"s11","variable":12,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"186":{"exp":190,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"187":{"end":"s191"},"188":{",":"s192","do":"r71"},"189":{"end":"s193"},"190":{"}":"r98",",":"r98","NEWLINE":"r98"},"191":{"[":"r36",".":"r36","undefined":"r36","(":"r36","AND":"r36","CMP":"r36","ADD":"r36","MUL":"r36","POW":"r36","NEWLINE":"r36",")":"r36","end":"r36","then":"r36","do":"r36","catch":"r36","STR":"r36","BSTR":"r36","]":"r36",",":"r36","else":"r36","elseif":"r36","}":"r36"},"192":{"exp":194,"cprim":10,"throw":"s11","variable":52,"ID":"s13","(":"s14","sprim":15,"NOT":"s16","local":"s17","primary":18,"ADD":"s19","cstr":20,"literal":21,"do":"s22","let":"s23","if":"s24","for":"s25","while":"s26","fn":"s53","try":"s27","pstr":28,"NUM":"s29","STR":"s30","nil":"s31","tableconst":32,"arrayconst":33,"BSTR":"s34","{":"s35","[":"s36"},"193":{"[":"r40",".":"r40","undefined":"r40","(":"r40","AND":"r40","CMP":"r40","ADD":"r40","MUL":"r40","POW":"r40","NEWLINE":"r40",")":"r40","end":"r40","then":"r40","do":"r40","catch":"r40","STR":"r40","BSTR":"r40","]":"r40",",":"r40","else":"r40","elseif":"r40","}":"r40"},"194":{"do":"r72"}}

/***/ }
/******/ ])
});
;