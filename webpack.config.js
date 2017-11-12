const path = require('path');
const {optimize: {UglifyJsPlugin}} = require('webpack');

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'fist.min.js',
    library: 'fist',
  },
  plugins: [
    new UglifyJsPlugin(),
  ],
};
