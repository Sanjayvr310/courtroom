/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@courtroom/ui", "@courtroom/types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

module.exports = nextConfig;
