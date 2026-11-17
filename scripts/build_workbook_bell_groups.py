"""Prepare all 60 question groups locally; never writes application data."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import re
import subprocess
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

parser = argparse.ArgumentParser()
parser.add_argument('--cut', action='store_true')
parser.add_argument('--from', dest='first', type=int, default=1)
parser.add_argument('--to', dest='last', type=int, default=60)
args = parser.parse_args()
BASE = Path('tmp/workbook-listening-elevenlabs')
RATE = 8000
STARTS = {
 1:[1,5,9],2:[1,6,8],3:[1,5,8],4:[1,4,6,8],5:[1,4,6],6:[1,4,9],7:[1,3,5],8:[1,3,5,8],9:[1,3,7,9],10:[1,3,5,7],
 11:[1,4,6],12:[1,3,7],13:[1,3,5,8],14:[1,4,7,8,9],15:[1,4,8],16:[1,4,6],17:[1,4,7],18:[1,3,6],19:[1,6,9],20:[1,5,8],
 21:[1,4,9],22:[1,4,7],23:[1,3,4,6,7,8,10],24:[1,3,6,8],25:[1,4,7,9],26:[1,3,7],27:[1,4,6,9],28:[1,4,7],29:[1,4,7],30:[1,4,7,9],
}
OVERRIDES = {8:{3:9,5:34},14:{1:0,4:59,8:93},19:{1:0},23:{1:0,6:56,7:78,10:141},27:{1:1,4:16},28:{1:0},57:{7:80}}
FALLBACK_HEADINGS = {
 (5,1):'들은 것을 고르십시오.',(5,4):'다음을 듣고 물음에 알맞은 대답을 고르십시오.',(5,6):'다음을 잘 듣고 대화 내용과 같은 것을 고르십시오.',
 (16,1):'두 사람은 무엇에 대해 말하고 있습니까?',(16,4):'다음 그림을 보고 알맞은 대답을 고르십시오.',(16,6):'다음을 듣고 물음에 알맞은 대답을 고르십시오.',
 (8,5):'다음 중 들은 내용과 같은 것은 무엇입니까?',(23,6):'여자가 이어서 할 행동은 무엇입니까?',(23,10):'두 사람은 무엇에 대해 말하고 있습니까?',
 (27,6):'다음을 듣고 이어지는 말로 가장 알맞은 것을 고르십시오.',(57,7):'7–8번',
}
# Visually checked printed headers omitted from the old interaction OCR.
PAGE_ANCHORS = {(8,5):(79,.085),(14,8):(133,.085),(18,3):(166,.745),(24,3):(217,.69),(25,9):(227,.52),(36,7):(57,.17),(37,7):(66,.17),(38,7):(75,.17),(42,7):(107,.17),(48,9):(160,.085)}
NUMBERS = {'일':1,'이':2,'삼':3,'사':4,'오':5,'육':6,'칠':7,'팔':8,'구':9,'십':10,'아홉':9,'여덟':8,'열':10}
def question(text):
    m = re.match(r'^\s*(\d{1,2}|아홉|여덟|[일이삼사오육칠팔구십열])\s*(번|[.,]|$)', text)
    if not m: return None
    return int(m[1]) if m[1].isdigit() else NUMBERS[m[1]]

def command(cmd):
    return subprocess.run(cmd, capture_output=True, check=True)

def decode(file):
    return np.frombuffer(command(['ffmpeg','-v','error','-i',str(file),'-ac','1','-ar',str(RATE),'-f','f32le','-']).stdout, dtype='<f4').astype(float)

def intervals(mask, left, step=.01, merge=.08):
    result=[]; start=None
    for i, active in enumerate(np.r_[mask, False]):
        if active and start is None: start=i
        if not active and start is not None:
            begin=left+start*step; end=left+i*step
            if result and begin-result[-1][1] < merge: result[-1][1]=end
            else: result.append([begin,end])
            start=None
    return result

def boundary(audio, anchor, previous_end, first):
    left=max(0, previous_end+.02 if not first else anchor-15)
    right=max(left,anchor-.15)
    samples=audio[round(left*RATE):round(right*RATE)]
    n=len(samples)//80
    if n < 2: return {'time':0 if first else max(previous_end,anchor-.1),'method':'no_room_before_speech','bell':None}
    rms=np.sqrt(np.mean(samples[:n*80].reshape(-1,80)**2,axis=1))
    events=intervals(rms>.005,left)
    bells=[]
    diagnostics=[]
    for begin,end in events:
        if not .35 <= end-begin <= 3: continue
        event=audio[round(begin*RATE):round(end*RATE)]
        power=np.abs(np.fft.rfft(event*np.hanning(len(event))))**2
        freq=np.fft.rfftfreq(len(event),1/RATE)
        peak=freq[np.argmax(power)]
        bands=np.zeros(len(freq),dtype=bool)
        for center in (392,523.25,550,784,1048,1100,1568,1650,2096): bands |= np.abs(freq-center)<15
        fraction=float(power[bands].sum()/max(power.sum(),1e-15))
        diagnostics.append({'start':round(begin,3),'end':round(end,3),'peakHz':round(float(peak),2),'fraction':round(fraction,3)})
        if 370 <= peak <= 1150 and fraction >= .64 and anchor-end >= .3:
            bells.append({'start':round(begin,4),'end':round(end,4),'peakHz':round(float(peak),2),'musicalBandFraction':round(fraction,4)})
    if bells:
        bell=bells[-1]
        cut=max(0,bell['start']-.1)
        if not first and cut < previous_end: raise ValueError('Bell overlaps previous recognized speech')
        return {'time':cut,'method':'100ms_before_bell','bell':bell,'transitionEvents':diagnostics}
    # Some supplied tracks contain no bell at a section transition. Use an
    # actual silent interval before its instruction, without inventing a tone.
    quiet=intervals(rms<.005,left,merge=0)
    quiet=[(a,b) for a,b in quiet if b-a>=.08 and (first or a>=previous_end)]
    if first and anchor < 1: return {'time':0,'method':'recording_starts_without_bell','bell':None,'transitionEvents':diagnostics}
    if quiet:
        a,b=max(quiet,key=lambda item:item[1]-item[0])
        cut=max(a,min(b-.02,anchor-.3))
        return {'time':round(cut,4),'method':'measured_silence_no_bell','bell':None,'transitionEvents':diagnostics}
    if first: return {'time':0,'method':'recording_starts_without_bell','bell':None}
    raise ValueError(f'No safe silent cut at {anchor}')

def process(lesson):
    root=BASE/f'B{lesson}'
    plan=json.loads((root/'group-text-plan.json').read_text(encoding='utf-8'))
    source=json.loads((root/'segments.json').read_text(encoding='utf-8'))
    transcript=json.loads((root/'transcript.json').read_text(encoding='utf-8'))
    volume=1 if lesson<=30 else 2
    original=Path(f'D:/DATA-E9/MP3-SBT-Q{volume}/FULL/B{lesson}.mp3')
    checksum=hashlib.sha256(original.read_bytes()).hexdigest()
    if checksum!=source['sourceChecksum'] or checksum!=transcript['sourceChecksum'] or transcript['provider']!='elevenlabs': raise ValueError('Provenance mismatch')
    segments=source['segments']
    starts=STARTS.get(lesson,[1,3,5,7,8] if lesson==47 else [1,3,5,7,9])
    chosen=[]
    for q in starts:
        override=OVERRIDES.get(lesson,{}).get(q)
        candidates=[c for c in plan['candidates'] if c['nextQuestion']==q]
        if override is not None:
            index=override; text=segments[index]['text_ko']
        elif candidates:
            index=candidates[0]['firstSegment']; text=candidates[0]['text']
        elif lesson==55 and q==9:
            index=plan['candidates'][-1]['firstSegment']; text=plan['candidates'][-1]['text']
        else:
            last=chosen[-1]['segmentIndex'] if chosen else -1
            options=[i for i,s in enumerate(segments) if i>last and question(s['text_ko'])==q]
            strong=[i for i in options if '문제입니다' in segments[i]['text_ko']]
            if not options: raise ValueError(f'No anchor for question {q}')
            index=(strong or options)[0]; text=segments[index]['text_ko']
        if chosen and index<=chosen[-1]['segmentIndex']: raise ValueError('Question groups out of order')
        text=FALLBACK_HEADINGS.get((lesson,q),text)
        chosen.append({'startQ':q,'segmentIndex':index,'instruction':text,'headingWordStart':segments[index]['start']})
    audio=decode(root/'reindexed-full.mp3')
    audio=sosfilt(butter(3,65,fs=RATE,btype='highpass',output='sos'),audio)
    for i,item in enumerate(chosen):
        prev=segments[item['segmentIndex']-1]['end'] if item['segmentIndex'] else 0
        item.update(boundary(audio,item['headingWordStart'],prev,i==0))
    # Keep the two reviewed pilots' approved exact boundaries.
    if lesson in (1,2):
        pilot=json.loads((root/'question-groups-pilot/report.json').read_text(encoding='utf-8'))
        for item,group in zip(chosen,pilot['groups']): item.update({'time':group['start'],'method':'100ms_before_bell','bell':group['bell']})
    words=[w for w in transcript['words'] if w['type']=='word' and w['text'].strip()]
    output=root/'question-groups'
    output.mkdir(exist_ok=True)
    groups=[]
    covered=[]
    for i,item in enumerate(chosen):
        start=item['time']; end=chosen[i+1]['time'] if i+1<len(chosen) else source['duration']
        if start>=end: raise ValueError('Invalid group duration')
        selected=[(j,w) for j,w in enumerate(words) if w['start']>=start and w['start']<end]
        if not selected or any(w['end']>end+.025 for _,w in selected): raise ValueError(f'Cut intersects recognized words in group {item["startQ"]}')
        covered.extend(j for j,_ in selected)
        last_q=starts[i+1]-1 if i+1<len(starts) else 10
        fields=[f for f in plan['fields'] if f['page']>=plan['endPage']-3 and (m:=re.search(r'(?:^|Câu\s+)(\d+)\b',f['label'])) and int(m[1])==item['startQ']]
        fields.sort(key=lambda f:(f['page'],f['y']))
        field=fields[0] if fields else None
        if not field:
            # A header represented as one shared field, or an omitted OCR field.
            fields=[f for f in plan['fields'] if f['page']>=plan['endPage']-3 and re.search(rf'\[\s*{item["startQ"]}\s*[-–]',f['label'])]
            field=fields[0] if fields else None
        page=field['page'] if field else max(plan['startPage'],plan['endPage']-1)
        anchor_y=max(.02,field['y']-.035) if field else .12
        if (lesson,item['startQ']) in PAGE_ANCHORS:
            page,anchor_y=PAGE_ANCHORS[(lesson,item['startQ'])]
        text=' '.join(w['text'].strip() for _,w in selected)
        filename=f'B{lesson}-{i+1}-questions-{item["startQ"]}-{last_q}.mp3'
        group={**item,'questions':f'{item["startQ"]}-{last_q}','endQ':last_q,'start':start,'end':end,'file':filename,'text_ko':text,'firstWord':selected[0][0],'lastWord':selected[-1][0],'pageNumber':page,'anchorY':anchor_y,'anchorFieldId':field['id'] if field else None}
        if args.cut:
            target=output/filename
            command(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(root/'reindexed-full.mp3'),'-t',str(end-start),'-map','0:a:0','-vn','-c:a','libmp3lame','-b:a','128k',str(target)])
            duration=float(command(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(target)]).stdout)
            if abs(duration-(end-start))>.15: raise ValueError('Encoded duration mismatch')
            decoded=decode(target)
            if item['bell']:
                head=decoded[:round(min(1.8,item['bell']['end']-item['bell']['start']+.2)*RATE)]
                if np.sqrt(np.mean(head**2)) < .005: raise ValueError('Opening bell missing')
                head=sosfilt(butter(3,65,fs=RATE,btype='highpass',output='sos'),head)
                spectrum=np.abs(np.fft.rfft(head*np.hanning(len(head))))**2
                frequency=np.fft.rfftfreq(len(head),1/RATE)[np.argmax(spectrum)]
                reference=audio[round(start*RATE):round(start*RATE)+len(head)]
                ref_spectrum=np.abs(np.fft.rfft(reference*np.hanning(len(reference))))**2
                ref_frequency=np.fft.rfftfreq(len(reference),1/RATE)[np.argmax(ref_spectrum)]
                if abs(frequency-ref_frequency)>22: raise ValueError(f'Opening bell frequency mismatch: clip {frequency}, source {ref_frequency}')
            group['clipChecksum']=hashlib.sha256(target.read_bytes()).hexdigest()
            group['encodedDuration']=duration
            (output/filename.replace('.mp3','.ko.txt')).write_text(text,encoding='utf-8')
        groups.append(group)
    expected=[i for i,w in enumerate(words) if w['start']>=chosen[0]['time']]
    if covered!=expected: raise ValueError('Recognized speech lost or repeated')
    report={'lesson':lesson,'sourceChecksum':checksum,'duration':source['duration'],'boundaryRule':'before_group_bell_with_silence_fallback_when_absent','groups':groups,'skippedPreludeWords':covered[0],'coveredWords':len(covered),'cutsVerified':args.cut,'checks':{'wordCoverage':True,'orderedGroups':True,'provenance':True,'noSpeechCrossesCuts':True,'clipsDecodeAndDurationVerified':args.cut,'openingBellsVerified':args.cut},'notes':[f"Group {g['questions']}: no bell in the transition; used {g['method']}" for g in groups if not g['bell']]}
    (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'lesson':lesson,'status':'cut_verified' if args.cut else 'planned','groups':len(groups),'bells':sum(bool(g['bell']) for g in groups),'notes':report['notes']}

def safe_process(lesson):
    try:
        result=process(lesson)
        print(f"B{lesson}: {result['groups']} groups, {result['bells']} bells",flush=True)
        return result
    except Exception as error:
        print(f'B{lesson}: FAILED {error}',flush=True)
        return {'lesson':lesson,'status':'failed','error':str(error)}

with ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(safe_process,range(args.first,args.last+1)))
Path('reports/workbook-batch-group-preparation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
if any(r['status']=='failed' for r in results): raise SystemExit(1)
