import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeNextPath } from '@/lib/auth-flow'
import { getTrustedUserRole, isAdminRole } from '@/lib/admin-role'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If Supabase is not configured, skip auth check and let the request through
    if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase environment variables not set, skipping auth middleware')
        return supabaseResponse
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                supabaseResponse = NextResponse.next({
                    request,
                })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    // Use a timeout to prevent middleware from hanging if Supabase is slow
    let user = null
    try {
        const userPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 4000)
        )

        const { data } = await Promise.race([userPromise, timeoutPromise]) as Awaited<ReturnType<typeof supabase.auth.getUser>>
        user = data?.user ?? null
    } catch (error) {
        // If auth check times out or fails, let the request through
        // The page-level auth checks will handle it
        console.warn('Middleware auth check failed or timed out:', error)
        return supabaseResponse
    }

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/register') &&
        !request.nextUrl.pathname.startsWith('/forgot-password') &&
        !request.nextUrl.pathname.startsWith('/reset-password') &&
        !request.nextUrl.pathname.startsWith('/check-email') &&
        !request.nextUrl.pathname.startsWith('/industrial-interview') &&
        !request.nextUrl.pathname.startsWith('/api/auth') &&
        !request.nextUrl.pathname.startsWith('/api/payment/webhook') &&
        request.nextUrl.pathname !== '/'
    ) {
        // If it's an API request, return 401 instead of redirecting
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Vui lòng đăng nhập lại (tài khoản đã đăng nhập ở nơi khác)' }, { status: 401 })
        }
        
        // no user, redirect to login page
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`))
        return NextResponse.redirect(url)
    }

    // If user is logged in and tries to access login/register, redirect to dashboard
    if (
        user &&
        (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))
    ) {
        const requestedPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'))
        const role = await getTrustedUserRole(user, supabase)
        const hasAdminAccess = isAdminRole(role)
        let destination = requestedPath
        if (requestedPath.startsWith('/admin') && !hasAdminAccess) destination = '/dashboard'
        return NextResponse.redirect(
            new URL(destination, request.url)
        )
    }

    // Role-Based Access Control logic for /admin routes
    if (user && request.nextUrl.pathname.startsWith('/admin')) {
        try {
            const profilePromise = getTrustedUserRole(user, supabase)
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout')), 3000)
            )

            const role = await Promise.race([profilePromise, timeoutPromise])

            if (!isAdminRole(role)) {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }
        } catch (error) {
            // If profile check fails, redirect to dashboard for safety
            console.warn('Admin role check failed:', error)
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
