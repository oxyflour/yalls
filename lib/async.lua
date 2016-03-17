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
