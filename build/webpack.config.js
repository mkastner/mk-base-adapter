module.exports = { 
  mode: 'production',
  target: 'web',
  node: {
    fs: 'empty'
  },
  externals: {
    axios: 'axios',
    qs: 'qs',
    vue: 'vue'
  },
  entry: {
    'vuex-base-store': [
      './src/vuex-base-store.js',
    ]
  },
  optimization: {
    minimize: false
  },
  //devtool: 'eval-source-map',
  output: {
    filename: '[name].js',
    libraryTarget: 'umd'
  },
  module: {
    noParse: /es6-promise\.js$/, // avoid webpack shimming process
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: {
          test: /node_modules/
        } 
      }
    ] 
  }, 
};


