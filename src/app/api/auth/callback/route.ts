import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/auth-flow'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = sanitizeNextPath(searchParams.get('next'))

    // Google/OAuth provider có thể trả về error trực tiếp trên query string
    const oauthError = searchParams.get('error')
    const oauthErrorDescription = searchParams.get('error_description')

    if (oauthError) {
        console.error('[Auth Callback] OAuth provider error:', oauthError, oauthErrorDescription)
        const url = new URL('/login', origin)
        url.searchParams.set('error', oauthError)
        if (oauthErrorDescription) {
            url.searchParams.set('error_description', oauthErrorDescription)
        }
        return NextResponse.redirect(url)
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else if (siteUrl) {
                return NextResponse.redirect(`${siteUrl}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }

        console.error('[Auth Callback] exchangeCodeForSession error:', error.message)
        const url = new URL('/login', origin)
        url.searchParams.set('error', 'auth_code_exchange_failed')
        url.searchParams.set('error_description', error.message)
        return NextResponse.redirect(url)
    }

    // Không có code và cũng không có error → redirect về login với thông báo
    console.error('[Auth Callback] Missing authorization code')
    const url = new URL('/login', origin)
    url.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(url)
}
