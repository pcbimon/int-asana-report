import { updateSession } from '@/lib/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow server-to-server sync calls when a valid service key is present
  if (pathname.startsWith('/api/sync')) {
    const serviceKey = request.headers.get('x-sync-service-key')
    const expectedKey = process.env.SYNC_SERVICE_KEY
    if (serviceKey && expectedKey && serviceKey === expectedKey) {
      // bypass auth redirect for scheduled job
      return NextResponse.next()
    }
    // else: fall through to normal auth checks (which may redirect)
  } else {
    return await updateSession(request)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
