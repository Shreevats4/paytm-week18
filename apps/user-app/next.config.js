/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@repo/ui", "@repo/store", "@repo/db"],
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
};