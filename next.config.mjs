/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A second dev server (or a check run) can build into its own folder so the two never overwrite each other.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self \"https://*.daily.co\"), microphone=(self \"https://*.daily.co\"), display-capture=(self \"https://*.daily.co\"), geolocation=()" }, // the call room embeds Daily (CL2)
    ]}];
  },
};
export default nextConfig;
