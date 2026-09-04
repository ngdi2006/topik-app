import { NextRequest, NextResponse } from 'next/server'

function headerValue(request: NextRequest, name: string) {
    const value = request.headers.get(name)?.trim()
    if (!value) return null
    try { return decodeURIComponent(value) } catch { return value }
}

function deviceFromUserAgent(userAgent: string) {
    if (/ipad|tablet|playbook|silk/i.test(userAgent)) return 'tablet'
    if (/mobile|iphone|ipod|android/i.test(userAgent)) return 'mobile'
    return 'desktop'
}

function browserFromUserAgent(userAgent: string) {
    if (/edg\//i.test(userAgent)) return 'Edge'
    if (/coc_coc_browser|cococ/i.test(userAgent)) return 'Cốc Cốc'
    if (/ucbrowser|ucweb/i.test(userAgent)) return 'UC Browser'
    if (/opr\//i.test(userAgent)) return 'Opera'
    if (/firefox\//i.test(userAgent)) return 'Firefox'
    if (/chrome\//i.test(userAgent)) return 'Chrome'
    if (/safari\//i.test(userAgent)) return 'Safari'
    return 'Khác'
}

export function GET(request: NextRequest) {
    const userAgent = request.headers.get('user-agent') || ''
    return NextResponse.json({
        country: headerValue(request, 'x-vercel-ip-country') || headerValue(request, 'cf-ipcountry'),
        region: headerValue(request, 'x-vercel-ip-country-region') || headerValue(request, 'cf-region'),
        city: headerValue(request, 'x-vercel-ip-city') || headerValue(request, 'cf-ipcity'),
        device: deviceFromUserAgent(userAgent),
        browser: browserFromUserAgent(userAgent),
    }, { headers: { 'Cache-Control': 'private, max-age=1800' } })
}
