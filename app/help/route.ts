import { NextResponse } from 'next/server';
import { withObservedSpan } from '@/lib/observability';

export function GET() {
  return withObservedSpan(
    'api.help.get',
    { 'http.method': 'GET', 'http.route': '/help' },
    async () =>
      NextResponse.json({
        message:
          "breaking news: no one's coming to help you twin✌🏼, or better, this video changed my perspective on things : https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
  );
}
