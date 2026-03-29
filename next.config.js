/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.pump.fun' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: '**.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'cf-ipfs.com' },
    ],
  },
  // Required for Grammy webhook handler
  experimental: {
    serverComponentsExternalPackages: ['grammy'],
  },
}

module.exports = nextConfig
