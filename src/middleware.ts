import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { isLockedLearningPath } from './lib/learner-feature-flags'

export async function middleware(request: NextRequest) {
    if (isLockedLearningPath(request.nextUrl.pathname)) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Cụm học tập đang được phát triển và tạm khóa.' },
                { status: 503 },
            )
        }

        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = '/dashboard'
        dashboardUrl.search = '?notice=learning-in-development'
        return NextResponse.redirect(dashboardUrl)
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
