/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for external sources
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'indiamorning.in',
      },
      {
        protocol: 'https',
        hostname: 'www.indiamorning.in',
      },
      {
        protocol: 'https',
        hostname: 'indiamorning.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Enable compression
  compress: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,
};

export default nextConfig;
