const pkgjson = require("./package.json");
const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const {
  BundleAnalyzerPlugin
} = require('webpack-bundle-analyzer');
const autoprefixer = require('autoprefixer');
const ManifestPlugin = require('webpack-manifest-plugin');
const WebpackOnBuildPlugin = require('on-build-webpack');
const fs = require('fs');
const shell = require('shelljs');
const exec = require('child_process').exec;
const ExtractTextPlugin = require('extract-text-webpack-plugin');


module.exports = (env = {}) => {

  const _TARGET = "web";
  const __ANALYZE__ = env.analyze;
  const __DEV__ = env.development;
  const __PROD__ = env.production || __ANALYZE__;


  if (__PROD__ === __DEV__) {
    throw new Error("Production or development configuration must be selected");
  }

  let _ENV = null;
  if (__PROD__) {
    _ENV = 'production';
  }

  if (__DEV__) {
    _ENV = 'development';
  }

  /****************************************************************************/
  let entry = {};
  entry['lib'] = ["jquery", "popper.js", "bootstrap", "moment", "lodash", "reactstrap"];
  entry['index'] = [path.join(__dirname, 'src', 'index.jsx')];
  entry = {
    ...entry
  };

  let sourceMap = true;
  const safeVer = pkgjson.version.replace(/\./g, '_').replace(/-/g, '_');
  let library = pkgjson.mountpoint + "LibraryDLL_" + safeVer;
  let font_files = "fonts/[name].[ext]";
  let filename = "[name].js";
  let extractOut = "style.css";
  let devtool = 'cheap-module-source-map';
  if (__PROD__) {
    sourceMap = false;
    extractOut = "style_[hash].css";
    font_files = 'fonts_[hash].[ext]';
    library = "lib_[id]_[hash]_" + safeVer;
    filename = 'res_[id]_[hash]_' + safeVer + '.js';
    devtool = false;
  }

  /****************************************************************************/
  let plugins = [
    new ManifestPlugin(),
    new ExtractTextPlugin(extractOut),
    new webpack.DllPlugin({
      name: library,
      path: path.join(__dirname, "/dist/[name].json")
    }),
    new webpack.DefinePlugin({
      "process.env": {
        "NODE_ENV": JSON.stringify(_ENV),
        "BUILD_TARGET": JSON.stringify(_TARGET)
      }
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      Popper: ['popper.js', 'default']
    })
  ];

  if (__PROD__) {
    plugins.push(new UglifyJSPlugin());
  }

  if (__DEV__) {
    plugins.push(new webpack.NamedModulesPlugin());
    plugins.push(new webpack.NoEmitOnErrorsPlugin());
  }


  if (__ANALYZE__) {
    plugins.push(new BundleAnalyzerPlugin());
  }

  /****************************************************************************/
  let rules = [];
  rules.push({
    test: /\.(css)$/,
    loaders: ExtractTextPlugin.extract({
      use: [{
          loader: 'css-loader', // translates CSS into CommonJS modules
          options: {
            sourceMap,
            modules: true
          }
        },
        {
          loader: 'postcss-loader', // Run post css actions
          options: {
            ident: 'postcss',
            plugins: () => [
              require('postcss-flexbugs-fixes'),
              autoprefixer({
                browsers: [
                  '>1%',
                  'last 4 versions',
                  'Firefox ESR',
                  'not ie < 9', // React doesn't support IE8 anyway
                ],
                flexbox: 'no-2009',
              }),
            ],
          }
        }
      ]
    })
  });
  rules.push({
    test: /\.(scss)$/,
    loaders: ExtractTextPlugin.extract({
      use: [{
          loader: 'css-loader', // translates CSS into CommonJS modules
          options: {
            sourceMap
          }
        },
        {
          loader: 'postcss-loader', // Run post css actions
          options: {
            sourceMap,
            plugins: function() { // post css plugins, can be exported to postcss.config.js
              return [
                require('postcss-flexbugs-fixes'),
                require('autoprefixer')
              ];
            }
          }
        },
        {
          loader: 'sass-loader', // compiles SASS to CSS
          options: {
            sourceMap
          }
        }
      ]
    })
  });
  rules.push({
    test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
    loader: 'file-loader?name=' + font_files
  });
  let externals = {};

  return {
    context: path.resolve(__dirname, '.'),
    target: _TARGET,
    entry,
    output: {
      library,
      filename,
      libraryTarget: 'umd',
      path: path.resolve(__dirname, './dist')
    },
    module: {
      rules
    },
    plugins,
    resolve: {
      modules: [
        path.resolve(__dirname),
        'node_modules'
      ],
      extensions: ['.js', '.jsx']
    },
    devtool
  };
}
