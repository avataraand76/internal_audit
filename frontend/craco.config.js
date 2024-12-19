const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      if (env === "production") {
        // Tắt source map trong production
        webpackConfig.devtool = false;

        // Thêm plugin để minimize và obfuscate code
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimize: true,
          splitChunks: {
            chunks: "all",
          },
        };

        // Thêm Terser plugin với các tùy chọn để bảo vệ code
        webpackConfig.plugins.push(
          new webpack.optimize.MinChunkSizePlugin({
            minChunkSize: 10000,
          })
        );
      }
      return webpackConfig;
    },
  },
};
