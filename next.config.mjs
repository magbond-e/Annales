/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/epreuves',
        permanent: false,
      },
      {
        source: '/annales',
        destination: '/epreuves',
        permanent: false,
      },
      {
        source: '/profil',
        destination: '/mes-depots',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
