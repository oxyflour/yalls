clamp, interp = **require('../../lib/math')

describe('math lib', fn()

	it('should check clamp', fn()
		assert.equal(clamp(0.5, 0, 1), 0.5)
		assert.equal(clamp(1.5, 0, 1), 1)
		assert.equal(clamp(-1,  0, 1), 0)
	end)

	it('should check interp', fn()
		assert.equal(interp(0, 2, 3), 2)
		assert.equal(interp(1, 2, 3), 3)
		assert.equal(interp(0.5, 2, 3), 2.5)
	end)

end)
