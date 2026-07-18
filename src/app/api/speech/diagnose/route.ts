import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY
        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'

        const status = {
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0,
            apiKeyPrefix: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
            voiceId: voiceId,
            nodeEnv: process.env.NODE_ENV || 'undefined',
            vercel: process.env.VERCEL || 'undefined',
            vercelEnv: process.env.VERCEL_ENV || 'undefined',
            testConnection: 'Not tested'
        }

        if (apiKey) {
            try {
                // Test call to ElevenLabs voices endpoint to verify API key validity
                const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                    headers: {
                        'xi-api-key': apiKey
                    }
                })
                
                if (response.ok) {
                    status.testConnection = 'SUCCESS - ElevenLabs API key is VALID and working'
                } else {
                    const errorText = await response.text()
                    status.testConnection = `FAILED - API key invalid or rate limited. Status: ${response.status}. Detail: ${errorText}`
                }
            } catch (fetchErr: any) {
                status.testConnection = `ERROR - Network error connecting to ElevenLabs: ${fetchErr.message}`
            }
        } else {
            status.testConnection = 'FAILED - No API Key configured'
        }

        return NextResponse.json(status)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
