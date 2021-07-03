const path = require('path')
const { merge } = require('webpack-merge');

const common = require('./webpack.config.js');

module.exports = merge(common, {
    mode: 'development',

    // devtool: 'inline-source-map',
    devtool: 'eval-source-map',

    devServer: {
        historyApiFallback: true,
        contentBase: path.resolve(__dirname, './build'),
        open: false,
        compress: true,
        // hot: true,
        port: 8080,
        writeToDisk:true,
    },
});
