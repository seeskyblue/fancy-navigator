/* eslint-disable compat/compat */
const nodePath = require('path');

const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const getGitInfo = require('git-repo-info');

const pkg = require('./package.json');

const git = getGitInfo();

const base = __dirname;
const src = nodePath.resolve(base, 'src');
const dist = nodePath.resolve(base, 'dist');
const build = nodePath.resolve(base, 'build');
const content = nodePath.resolve(base, 'public');
const path = { base, src, dist, content, build };

const image = [/\.(bmp|gif|jpe?g|png|svg)$/];
const font = [/\.(woff|woff2|ttf|eot|svg)(\?t=[0-9]+)?$/];
const html = [/\.html$/];
const json = [/\.json$/];
const source = [/\.(js|jsx|ts|tsx)$/];
const style = [/\.css$/];
const type = { image, font, html, json, source, style };

const protocol = 'http:';
const host = '0.0.0.0';
const port = 9000;
const apiPort = 8000;
const ssoPort = 5000;
const apiProxy = `${protocol}//${host}:${apiPort}`;
const ssoProxy = `${protocol}//${host}:${ssoPort}`;
const config = {
  protocol,
  host,
  port,
  apiProxy,
  ssoProxy,
};

const baseURL = {
  REST: '/api/v3/',
  GQL: '/gql/',
};

function createDevprod(env = 'production') {
  return function devprod(dev, prod) {
    return env === 'production' ? prod : dev;
  };
}

module.exports = function webpackConfig(env = {}, argv = {}) {
  const devprod = createDevprod(env.NODE_ENV);
  const { CDN } = argv;

  return {
    mode: devprod('development', 'production'),
    // mode: 'development',

    context: path.base,

    devtool: devprod('module-source-map', 'hidden-cheap-module-source-map'),

    entry: {
      seedlink: ['./src/index.js'],
    },

    output: {
      path: devprod(path.dist, path.build),
      filename: `[name].asil.${git.sha}.js`,
      chunkFilename: `[name].asil.[contenthash].js`,
      publicPath: devprod('/', CDN || '/static/survey/'),
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

    devServer: devprod({
      contentBase: path.content,
      historyApiFallback: true,
      host: config.host,
      hot: true,
      overlay: true,
      port: config.port,
      proxy: [
        {
          context: Object.values(baseURL),
          target: config.apiProxy,
          secure: false,
        },
        {
          context: (req) => [/(\/*)?\/sso/, /raphael/].some((reg) => reg.test(req)),
          target: config.ssoProxy,
          secure: false,
        },
      ],
      useLocalIp: true,
    }),

    module: {
      rules: [
        {
          exclude: [...type.html, ...type.json, ...type.image, ...type.source, ...type.style],
          loader: 'file-loader',
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
        {
          test: /\.svg$/,
          loader: '@svgr/webpack',
        },
        {
          test: type.image,
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
        {
          test: type.source,
          // exclude: /node_modules\/(?!react-intl|intl-messageformat|intl-messageformat-parser)/,
          exclude: /node_modules/,
          loader: 'babel-loader',
        },
        {
          test: type.style,
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
        __REST_BASE_URL__: JSON.stringify(baseURL.REST),
        __GQL_BASE_URL__: JSON.stringify(baseURL.GQL),
        __BASE_PATH__: JSON.stringify(pkg.basePath),
        __DEVELOPMENT__: devprod(true, false),
        __GIT_BRANCH__: JSON.stringify(git.branch),
        __GIT_REVISION__: JSON.stringify(git.sha),
        __ROLLBAR_ACCESS_TOKEN__: devprod(undefined, JSON.stringify(pkg.rollbar)),
      }),
      new webpack.HashedModuleIdsPlugin(),
      new MiniCssExtractPlugin({
        filename: `seedlink.asil.[contenthash].css`,
        chunkFilename: `[name].asil.[contenthash].css`,
      }),
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        inject: true,
        template: nodePath.resolve(path.content, 'index.html'),
      }),
    ],

    resolve: {
      alias: {
        '@': path.src,
      },
      modules: [path.src, 'node_modules'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
  };
};
