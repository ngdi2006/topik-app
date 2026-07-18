import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const text = searchParams.get('text')

        if (!text) {
            return NextResponse.json({ error: 'Text query parameter is required' }, { status: 400 })
        }

        const apiKey = process.env.ELEVENLABS_API_KEY
        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'

        if (!apiKey) {
            console.warn('ElevenLabs API key missing in environment variables. TTS fallback will be used on client.')
            return NextResponse.json({ error: 'ElevenLabs API Key not configured' }, { status: 500 })
        }

        // Generate a unique filename using SHA-256 hash of the text and voice ID
        const hash = crypto.createHash('sha256').update(text + '_' + voiceId).digest('hex')
        const filename = `${hash}.mp3`
        
        // Define directory paths
        const cacheDir = path.join(process.cwd(), 'public', 'audio', 'tts')
        const filePath = path.join(cacheDir, filename)

        // 1. Check if the file is already cached
        if (fs.existsSync(filePath)) {
            console.log(`[ElevenLabs TTS] Serving cached audio for: "${text.substring(0, 15)}..."`)
            const fileBuffer = fs.readFileSync(filePath)
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': fileBuffer.length.toString(),
                }
            })
        }

        // 2. Ensure cache folder exists
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true })
        }

        // 3. Request audio generation from ElevenLabs
        console.log(`[ElevenLabs TTS] Generating new audio for: "${text.substring(0, 15)}..."`)
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[ElevenLabs TTS] API returned error status: ${response.status}`, errorText)
            return NextResponse.json({ error: 'ElevenLabs API call failed', details: errorText }, { status: response.status })
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 4. Save to static cache folder
        fs.writeFileSync(filePath, buffer)
        console.log(`[ElevenLabs TTS] Cached generated file: ${filename}`)

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            }
        })

    } catch (error: any) {
        console.error('[ElevenLabs TTS] Server Exception:', error)
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
    }
}
