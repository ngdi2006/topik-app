import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
        !request.nextUrl.pathname.startsWith('/api/auth') &&
        request.nextUrl.pathname !== '/'
    ) {
        // no user, redirect to login page
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user is logged in and tries to access login/register, redirect to dashboard
    if (
        user &&
        (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Role-Based Access Control logic for /admin routes
    if (user && request.nextUrl.pathname.startsWith('/admin')) {
        try {
            const profilePromise = supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout')), 3000)
            )

            const result = await Promise.race([profilePromise, timeoutPromise])
            const profile = result?.data

            if (!profile || profile.role !== 'admin') {
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
