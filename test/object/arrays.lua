describe('arrays', fn()

	it('should create array literals', fn()
		assert.deepEqual([ ], array())
		assert.deepEqual([1, 2, 3], array(1, 2, 3))

		a = [1, 2, 'a']
		assert.equal(a[0], 1)
		assert.equal(a[1], 2)
		assert.equal(a[2], 'a')
	end)

	it('should test array methods', fn()
		a = [1, 2, 'a']

		assert.equal(a.first(), 1)
		assert.equal(a.last(), 'a')

		b = [ ]
		a.each(x => b.push(x))
		assert.deepEqual(a, b)
	end)

end)
