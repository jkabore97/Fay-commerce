/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Product photos and CMS media live in Supabase Storage; allow any https host
    // so an admin can also paste an external partner-logo URL without a redeploy.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // The app renders fine with no Supabase configured (marketing content falls back
  // to built-in defaults), so a missing env var must never fail the build.
  env: {
    NEXT_PUBLIC_SITE_NAME: "Fay & Partenaires",
  },
};

export default nextConfig;
