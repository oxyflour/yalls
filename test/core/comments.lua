describe('comments', fn()

	it('should make some single line comments', fn() --comment
		-- comment
		assert.ok(1) -- comment
	end)

	it('should make some block comments', fn()
		--[[ throw some error --]]

		--[[
		--]]

		--[[ comments here

		--]]

		--[[

		comments here --]]

		--[[
			comments here
		--]]

		--[[
			-- comments here
		--]]

		assert.ok(1--[[, --]])
	end)

end)
