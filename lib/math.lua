clamp = fn(x, min, max)
	if x < min then
		min
	elseif x > max then
		max
	else
		x
	end
end

interp = fn(f, a, b)
	a * (1 - f) + b * f
end

exports = { clamp, interp }