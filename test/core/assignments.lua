describe('assignments', fn()

	it('should set one single variable', fn()
		a = 1
		assert.equal(a, 1)

		b = 'a'
		assert.equal(b, 'a')

		c = nil
		assert.equal(c, nil)

		d = x => 2
		assert.equal(d(), 2)

		e = [3, 4]
		assert.equal(e[0], 3)
		assert.equal(e[1], 4)

		f = { m = 5, n = x => 6 }
		assert.equal(f.m, 5)
		assert.equal(f.n(), 6)
	end)

	it('should set some variables', fn()
		a, b = 1, 2
		assert.equal(a, 1)
		assert.equal(b, 2)

		a, b = b, a
		assert.equal(a, 2)
		assert.equal(b, 1)

		c, d = *[1, 2]
		assert.equal(c, 1)
		assert.equal(d, 2)

		e, f = **{ e = 1, f = 2}
		assert.equal(e, 1)
		assert.equal(f, 2)
	end)

	it('should keep external variables unchanged', fn()
		a = 1

		do a = 2 end
		assert.equal(a, 1)

		let a = 2 do nil end
		assert.equal(a, 1)

		(fn() a = 2 end)()
		assert.equal(a, 1)
	end)

	it('should change values of external variables', fn()
		a = 1

		do a := 2 end
		assert.equal(a, 2)

		do a += 1 end
		assert.equal(a, 3)

		do a -= 1 end
		assert.equal(a, 2)

		do a *= 2 end
		assert.equal(a, 4)

		do a /= 2 end
		assert.equal(a, 2)

		do a %= 2 end
		assert.equal(a, 0)
	end)

end)
