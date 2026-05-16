import { NextResponse } from 'next/server';

/**
 * Debug endpoint to show current Socket.IO configuration
 * Access at: /api/debug/socket-config
 */
export async function GET() {
  const config = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    urls: {
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'NOT SET',
      betterAuthUrl: process.env.BETTER_AUTH_URL || 'NOT SET',
    },
    warnings: [] as string[],
  };

  // Check for common misconfigurations
  if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
    config.warnings.push(
      'NEXT_PUBLIC_SOCKET_URL is not set - WebSocket connections will fail',
    );
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    config.warnings.push(
      'NEXT_PUBLIC_APP_URL is not set - may cause authentication issues',
    );
  }

  if (!process.env.BETTER_AUTH_URL) {
    config.warnings.push(
      'BETTER_AUTH_URL is not set - authentication may fail',
    );
  }

  return NextResponse.json(config, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
