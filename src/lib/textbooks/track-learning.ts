import {z} from 'zod'
export const trackLearningSchema=z.object({
    version:z.literal(1),status:z.enum(['draft','reviewed']),sourceChecksum:z.string().length(64),playbackChecksum:z.string().length(64),duration:z.number().positive(),
    waveform:z.array(z.number().int().min(0).max(255)).min(2).max(4096),provider:z.literal('elevenlabs'),model:z.string().max(50),pageNumber:z.number().int().positive(),pages:z.array(z.number().int().positive()).min(1).max(10),
    segments:z.array(z.object({id:z.string().regex(/^s\d{4,6}$/),start:z.number().nonnegative(),end:z.number().nonnegative(),text_ko:z.string().max(10000),speakerIds:z.array(z.string().max(100)).max(20)})).min(1).max(1000),
}).superRefine((data,ctx)=>{if(!data.pages.includes(data.pageNumber)||new Set(data.segments.map(s=>s.id)).size!==data.segments.length||data.segments.some((s,i)=>s.end<s.start||s.end>data.duration+.1||i>0&&s.start<data.segments[i-1].start))ctx.addIssue({code:'custom',message:'Invalid track alignment'})})
export function parseTrackLearning(metadata:unknown){
    const item=metadata as {checksum?:string;track_learning?:unknown}|null
    const parsed=trackLearningSchema.safeParse(item?.track_learning)
    return parsed.success&&parsed.data.sourceChecksum===item?.checksum?parsed.data:null
}
export type TrackLearning=z.infer<typeof trackLearningSchema>
