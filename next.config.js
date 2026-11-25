// next.config.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/freelancerinc/image/upload/**',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/robots.txt', destination: '/api/seo/robots' },
        { source: '/sitemap.xml', destination: '/api/seo/sitemap' },
      ],
    };
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};