"""Precompute real audio envelopes for private workbook players."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import math
from pathlib import Path
import subprocess
import numpy as np

parser=argparse.ArgumentParser()
parser.add_argument('--from',dest='first',type=int,default=1)
parser.add_argument('--to',dest='last',type=int,default=60)
args=parser.parse_args()
def envelope(file,limit):
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(file),'-ac','1','-ar','8000','-f','f32le','-'],capture_output=True,check=True).stdout
    samples=np.frombuffer(raw,dtype='<f4')
    duration=len(samples)/8000
    count=min(limit,max(256,math.ceil(duration*12)))
    bins=np.linspace(0,len(samples),count+1,dtype=int)
    peaks=np.maximum.reduceat(np.abs(samples),bins[:-1])
    scale=max(float(np.quantile(peaks,.995)),1e-6)
    values=np.rint(np.sqrt(np.clip(peaks/scale,0,1))*255).astype('uint8').tolist()
    return {'peaks':values,'duration':duration,'audioChecksum':hashlib.sha256(file.read_bytes()).hexdigest()}

def process(lesson):
    root=Path(f'tmp/workbook-listening-elevenlabs/B{lesson}')
    directory=root/'question-groups'
    manifest=json.loads((directory/'web-manifest.json').read_text(encoding='utf-8'))
    report=json.loads((directory/'report.json').read_text(encoding='utf-8'))
    full=envelope(root/'reindexed-full.mp3',4096)
    if abs(full['duration']-manifest['duration'])>.15:raise ValueError(f'B{lesson}: full waveform duration mismatch')
    groups={}
    for group,segment in zip(report['groups'],manifest['segments']):
        file=directory/group['file']
        waveform=envelope(file,2048)
        if waveform['audioChecksum']!=group['clipChecksum'] or abs(waveform['duration']-group['encodedDuration'])>.15:raise ValueError(f'B{lesson}: clip waveform provenance mismatch')
        groups[segment['id']]=waveform
        segment['waveform']=waveform['peaks']
    manifest['waveform']=full['peaks']
    (directory/'waveforms.json').write_text(json.dumps({'version':1,'lesson':lesson,'sourceChecksum':manifest['sourceChecksum'],'full':full,'groups':groups}),encoding='utf-8')
    (directory/'web-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'B{lesson}: full track + {len(groups)} real waveforms verified',flush=True)
    return {'lesson':lesson,'groups':len(groups),'points':len(full['peaks'])+sum(len(group['peaks']) for group in groups.values()),'status':'verified'}

with ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(process,range(args.first,args.last+1)))
Path('reports/workbook-waveform-preparation.json').write_text(json.dumps({'results':results},indent=2),encoding='utf-8')
