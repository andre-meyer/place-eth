const HtmlWebpackPlugin = require('html-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')

const path = require('path')
const webpack = require('webpack')

const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
  devtool: 'eval-source-map',
  mode: isProduction ? 'production' : 'development',
  performance: {
    hints: isProduction ? 'warning' : false,
  },
  output: {
    publicPath: '',
    path: path.resolve(__dirname, 'docs'),
    filename: '[hash].js',
  },
  resolve: {
    symlinks: false,
    modules: [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'node_modules'),
    ],
    alias: {
      '~style': path.resolve(__dirname, 'src', 'style')
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        use: 'babel-loader',
      },
      {
        test: /\.(jpe?g|png|svg)$/i,
        loader: 'file-loader?hash=sha512&digest=hex&name=img/[hash].[ext]',
      },
      {
        test: /\.(css)$/,
        use: [
          'style-loader', 
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              modules: true,
              localIdentName: '[name]__[local]___[hash:base64:5]'
            },
          },
        ],
      },
      {
        test: /\.(ttf|otf|eot|woff(2)?)(\?[a-z0-9]+)?$/,
        loader: 'file-loader?name=fonts/[name].[ext]',
      },
      {
        test: /\.txt$/,
        use: 'raw-loader',
      },
    ],
  },
  devServer: {
    disableHostCheck: true,
    historyApiFallback: true,
    hot: true,
    port: 8080,
    contentBase: [path.join(__dirname, 'src')],
  },
  plugins: [
    new CaseSensitivePathsPlugin(),
    new HtmlWebpackPlugin({
      title: 'place.eth',
      template: path.join(__dirname, 'src', 'html', 'index.html')
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    })
  ],
}