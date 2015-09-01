--[[

	large block comment

--]]

describe('variables', fn()
	it('should set one single variable', fn()
		a = 1
		assert.equal(a, 1)
	end)

	it('should set some variables', fn()
		b, c = 2, 3
		assert.equal(b, 2)
		assert.equal(c, 3)
	end)

	it('should swap variables', fn()
		b, c = 2, 3
		c, b = b, c
		assert.equal(b, 3)
		assert.equal(c, 2)
	end)

end)

describe('functions', fn()
	it('should define and call lambda', fn()
		f2 = fn(x) x * x end
		assert.equal(f2(3), 9)
	end)

	it('should define and call closure', fn()
		f3 = fn(x)
			f4 = fn() x * x end
			f4()
		end
		assert.equal(f3(4), 16)
	end)

end)

describe('dict (table)', fn()
	d = { 1, 2, k: 'v', 3 }

	it('should create a dict', fn()
		assert.equal(d[0], 1)
		assert.equal(d[1], 2)
		assert.equal(d[2], 3)
		assert.equal(d.k, 'v')
		assert.equal(d['k'], 'v')
	end)

	it('should set dict member', fn()
		d.k = 'v2'
		assert.equal(d.k, 'v2')
		assert.equal(d['k'], 'v2')
	end)

	it('should set nested dict member', fn()
		d.d = { }
		d.d.k = 'v3'
		assert.equal(d.d.k, 'v3')
		assert.equal(d['d']['k'], 'v3')
	end)

	it('should set nested dict method', fn()
		d.m = fn() self.k end
		assert.equal(d.m(), 'v2')
	end)

end)

describe('array', fn()
	a = array(1, 2, 3)

	it('should create an array', fn()
		assert.equal(a[0], 1)
		assert.equal(a[1], 2)
		assert.equal(a[2], 3)
	end)

	s = a.map(fn(i) i * i end)
	
	it('should do map over an array', fn()
		assert.equal(s[0], 1)
		assert.equal(s[1], 4)
		assert.equal(s[2], 9)
	end)

end)

describe('if/else/elseif statements', fn()
	it('should assert if', fn()
		if 1 then
			assert.ok(1)
		end
	end)

	it('should assert else', fn()
		if 0 then
			assert.ok(0)
		else
			assert.ok(1)
		end
	end)

	it('should assert elseif', fn()
		if 0 then
			assert.ok(0)
		elseif 1 then
			assert.ok(1)
		else
			assert.ok(0)
		end
	end)

	it('should assert elseif2', fn()
		if 0 then
			assert.ok(0)
		elseif 1 then
			assert.ok(1)
		end
	end)
end)

describe('for statements', fn()
	it('should loop over [1, 5)', fn()
		a = array()
		for i = 1, 5 do a.push(i) end
		assert.equal(a.length, 4)
		assert.deepEqual(a, array(1, 2, 3, 4))
	end)

	it('should loop over 1, 3', fn()
		a = array()
		for i = 1, 2, 4 do a.push(i) end
		assert.equal(a.length, 2)
		assert.deepEqual(a, array(1, 3))
	end)

	it('should loop over [0, 5)', fn()
		a = array()
		for i = range(5) do a.push(i) end
		assert.equal(a.length, 5)
		assert.deepEqual(a, array(0, 1, 2, 3, 4))
	end)

	it('should loop over a dict', fn()
		d = { }
		for v, k = pair({ k:'v', 'v2' }) do d[k] = v end
		assert.equal(d.k, 'v')
		assert.equal(d[0], 'v2')
	end)

	it('should loop over an array', fn()
		a = array()
		for v, i = ipair(array(1, 2, 3)) do a.push(v + '.' + i) end
		assert.equal(a.length, 3)
		assert.deepEqual(a, array('1.0', '2.1', '3.2'))
	end)

end)
