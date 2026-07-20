/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tracerlens/db", "@tracerlens/sdk"],
  serverExternalPackages: ["postgres"]
};
export default nextConfig;
