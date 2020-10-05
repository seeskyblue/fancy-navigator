const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const getGitInfo = require('git-repo-info');

const pkg = require('./package.json');

const git = getGitInfo();
const basePath = __dirname; // path.resolve(__dirname, '..');

const image = [/\.(bmp|gif|jpe?g|png|svg)$/];
const font = [/\.(woff|woff2|ttf|eot|svg)(\?t=[0-9]+)?$/];
const html = [/\.html$/];
const json = [/\.json$/];
const source = [/\.(js|jsx|ts|tsx)$/];
const style = [/\.css$/];

function createDevprod(env = 'production') {
  return function devprod(dev, prod) {
    return env === 'production' ? prod : dev;
  };
}

module.exports = (env = {}) => {
  const devprod = createDevprod(env.NODE_ENV);

  return {
    mode: devprod('development', 'production'),

    context: basePath,

    devtool: devprod('module-source-map', 'hidden-cheap-module-source-map'),

    entry: './index.tsx',

    output: {
      path: path.resolve(basePath, 'build'),
      publicPath: '/',
    },

    optimization: {
      minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
      runtimeChunk: devprod(undefined, 'single'),
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },

    devServer: {
      contentBase: path.resolve(basePath, 'public'),
      historyApiFallback: true,
      host: '0.0.0.0',
      hot: true,
      overlay: true,
      port: 3000,
      useLocalIp: true,
    },

    module: {
      rules: [
        {
          exclude: [].concat(html, json, image, source, style),
          loader: 'file-loader',
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
        {
          test: image,
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
        {
          test: source,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: {
            rootMode: 'upward',
          },
        },
        {
          test: style,
          use: [
            devprod('style-loader', {
              loader: MiniCssExtractPlugin.loader,
            }),
            'css-loader',
          ],
        },
      ],
    },

    plugins: [
      new webpack.DefinePlugin({
        __VERSION__: JSON.stringify(pkg.version),
        __DEVELOPMENT__: devprod(true, false),
        __GIT_BRANCH__: JSON.stringify(git.branch),
        __GIT_REVISION__: JSON.stringify(git.sha),
      }),
      new webpack.HashedModuleIdsPlugin(),
      new MiniCssExtractPlugin({
        filename: `seedlink.asil.[contenthash].css`,
        chunkFilename: `[name].asil.[contenthash].css`,
      }),
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(basePath, 'public', 'index.html'),
      }),
    ],

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  };
};
