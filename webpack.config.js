var webpack = require('webpack')

module.exports = {
	entry: './index.js',
	output: {
		libraryTarget: 'umd',
		library: 'yalls',
		filename: './build/index.js'
	},
    module: {
    	exclude: /node_modules/,
        loaders: [
            { test: /\.js$/, loader: 'babel-loader?presets[]=es2015' }
        ]
    },
    externals: {
    	fs: true
    }
}