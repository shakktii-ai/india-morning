/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  
  // Enable compression
  compress: true,
  
  // Use SWC minification for faster builds
  swcMinify: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
};

export default nextConfig;
