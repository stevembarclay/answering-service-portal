import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ensure prompt template files in prompts/ are included in the serverless
  // function bundle when deployed to Vercel. Without this, fs.readFileSync
  // calls with dynamic paths are not statically traced and the files are
  // omitted — causing the AI coaches to silently fall back to inline defaults.
  experimental: {
    // @ts-expect-error: outputFileTracingIncludes is a valid Next.js config option not yet in the ExperimentalConfig types
    outputFileTracingIncludes: {
      '/api/answering-service/coach': ['./prompts/**'],
      '/api/answering-service/dashboard-coach': ['./prompts/**'],
    },
  },
}

export default nextConfig
