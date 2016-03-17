var { build, parse } = require('./src/grammar.js'),
	{ evaluate, environment, compile } = require('./src/cekvm.js'),
	buildins = require('./src/buildins.js')

// precompile the grammar table
var table = require('!./grammar.loader.js!./src/grammar.js'),
	uparse = parse
parse = src => uparse(src, table)

// import
var IMPORT_CACHE = { },
    DEPENDENCY_MAP = { }

var checkDependency = (base, child) => {
    return DEPENDENCY_MAP[child] && Object.keys(DEPENDENCY_MAP[child]).some(childDep => {
        return childDep === base || checkDependency(base, childDep)
    })
}

// prepare module environment
var LOADER_LIB = `
mkYield = fn(ret)
	next = fn(cc)
		fn(value)
			callcc(fn(rcc)
				ret := rcc
				cc(value)
			end)
		end
	end
	fn(value)
		callcc(fn(cc)
			ret({ next = next(cc), value })
		end)
	end
end

mkGenerator = fn(iter)
	next = fn()
		callcc(fn(cc)
			yield = mkYield(cc)
			iter(yield)
		end)
	end
	fn(value)
		ret = next and next(value)
		next := ret and ret.next
		ret and ret.value
	end
end

doAsync = fn(exec, next)
	next = mkGenerator(fn(yield)
		exec(yield, next)
		-- stop it or the code after doAsync will be executed again
		yield()
	end)
	next()
end

exports = { mkGenerator, doAsync }
`

var httpFetch = url =>
		fetch(url).then(resp => resp.text()),
	fileFetch = path => new Promise((resolve, reject) =>
		require('fs').readFile(path, (err, ret) => err ? reject(err) : resolve(ret))),
	doFetch = typeof window !== 'undefined' ? httpFetch : fileFetch
var doRequireAsync = (url, root) => new Promise((resolve, reject) => {
    doFetch(url).then(text => {
		text = [
			'doAsync(fn(yield, next)',
				'require = url => yield(__asyncRequire(url, next))',
				'exports = { }',
				text,
				'__asyncCallback(exports)',
			'end)',
		].join('\n')

		var tree = parse(text),
			code = compile(tree),
			env = environment(root)

		env('__asyncRequire', makeRequire(url, root))
		env('__asyncCallback', resolve)

		evaluate(code, env)
    }).catch(err => {
    	console.error(err)
    	console.error('load module `' + url + '` failed!')
    	reject(err)
    })
})

var doRequireSync = (url, root) => {
	var text = require('fs').readFileSync(url),
		tree = parse(text),
		code = compile(tree),
		env = environment(root)

	env('require', makeRequire(url, root))
	env('exports', { })

	evaluate(code, env)
	return env('exports')
}

var cononicalPath = require('canonical-path'),
    dirName = require('utils-dirname')

var makeRequire = (base, root) => (path, callback) => {
    var dir = dirName(base) || '.',
    	url = cononicalPath.normalize(dir + '/' + path + '.lua')

    ;(DEPENDENCY_MAP[base] || (DEPENDENCY_MAP[base] = { }))[url] = 1
    if (checkDependency(base, url))
        throw 'circular dependency found between `' + base + '` and `' + url + '` !'

    // use async loader
    if (callback !== undefined) {
	    if (!IMPORT_CACHE[url])
	        IMPORT_CACHE[url] = doRequireAsync(url, root)
	    IMPORT_CACHE[url].then(callback)
    }
    // use sync loader
    else {
    	if (!IMPORT_CACHE[url])
    		IMPORT_CACHE[url] = doRequireSync(url, root)
    	return IMPORT_CACHE[url]
    }
}

var execModule = (path, vars, callback) => {
	var env = environment(null, buildins)
	for (var name in vars)
		env(name, vars[name])
	evaluate(compile(parse(LOADER_LIB)), env)
	makeRequire('.', env)(path, callback)
}

module.exports = {
	table, build, parse, compile,
	evaluate, environment, buildins,
	execModule
}