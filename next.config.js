/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['three', '@react-three/drei', 'troika-three-text', 'webgl-sdf-generator'],
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /troika-three-text/ },
      { module: /webgl-sdf-generator/ }
    ];
    return config;
  }
}

module.exports = nextConfig
