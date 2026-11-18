"""Cut introductory audio at measured bells/silence and map groups to printed headings."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import numpy as np
from scipy import ndimage as ndi
from scipy.signal import butter, sosfilt
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--write-anchors', action='store_true')
args = parser.parse_args()
root = Path('tmp/workbook-listening-intro')
tracks = json.loads((root / 'sources.json').read_text(encoding='utf-8'))
by_key = {t['key']: t for t in tracks}
rate = 8000
code = 'eps-topik-2025-workbook-1'
plans = {
    'hangul-1': [(0, 1, 4, 4, .577, '잘 듣고 맞으면 O, 틀리면 X 하십시오.'), (19, 5, 9, 4, .683, '잘 듣고 맞는 것을 고르십시오.')],
    'hangul-2-a': [(0, 1, 4, 11, .38, '잘 듣고 맞으면 O, 틀리면 X 하십시오.'), (19, 5, 9, 11, .455, '잘 듣고 알맞은 것을 고르십시오.'), (41, 10, 15, 11, .70, '잘 듣고 쓰십시오.')],
    'hangul-2-b': [(0, 16, 20, 11, .827, '잘 듣고 맞으면 O, 틀리면 X 하십시오.'), (22, 21, 28, 12, .10, '잘 듣고 알맞은 것을 고르십시오.'), (56, 29, 36, 12, .30, '잘 듣고 쓰십시오.')],
    'greetings': [(0, 1, 5, 14, .16, '잘 듣고 쓰십시오.')],
}

def run(command):
    return subprocess.run(command, check=True, capture_output=True).stdout

def decode(file, sample_rate=rate, channels=1):
    return np.frombuffer(run(['ffmpeg', '-v', 'error', '-i', str(file), '-ac', str(channels), '-ar', str(sample_rate), '-f', 'f32le', '-']), dtype='<f4')

def duration(file):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(file)]))

def intervals(mask, left, merge=.08):
    result, start = [], None
    for i, active in enumerate(np.r_[mask, False]):
        if active and start is None: start = i
        if not active and start is not None:
            begin, end = left + start * .01, left + i * .01
            if result and begin - result[-1][1] < merge: result[-1][1] = end
            else: result.append([begin, end])
            start = None
    return result

def cut_boundary(audio, anchor, previous_end):
    left, right = max(0, previous_end + .02), anchor - .15
    samples = audio[round(left * rate):round(right * rate)]
    n = len(samples) // 80
    if n < 2: raise ValueError('No transition window')
    rms = np.sqrt(np.mean(samples[:n * 80].reshape(-1, 80) ** 2, axis=1))
    bells = []
    for begin, end in intervals(rms > .005, left):
        if not .35 <= end - begin <= 3: continue
        event = audio[round(begin * rate):round(end * rate)]
        power = np.abs(np.fft.rfft(event * np.hanning(len(event)))) ** 2
        freq = np.fft.rfftfreq(len(event), 1 / rate)
        peak = float(freq[np.argmax(power)])
        bands = np.zeros(len(freq), dtype=bool)
        for center in (392, 523.25, 550, 784, 1048, 1100, 1568, 1650, 2096): bands |= np.abs(freq - center) < 15
        fraction = float(power[bands].sum() / max(power.sum(), 1e-15))
        if 370 <= peak <= 1150 and fraction >= .64 and anchor - end >= .3:
            bells.append(dict(start=begin, end=end, peakHz=peak, musicalBandFraction=fraction))
    if bells:
        bell = bells[-1]
        cut = max(previous_end + .02, bell['start'] - .10)
        return dict(time=cut, method='100ms_before_measured_bell', bell=bell)
    quiet = [(a, b) for a, b in intervals(rms < .005, left, merge=0) if b - a >= .08]
    if not quiet: raise ValueError(f'No safe silence before instruction at {anchor}')
    a, b = max(quiet, key=lambda item: item[1] - item[0])
    return dict(time=(a + b) / 2, method='measured_silence_no_bell', bell=None)

def envelope(file, limit):
    samples = decode(file)
    count = min(limit, max(256, math.ceil(len(samples) / rate * 12)))
    bins = np.linspace(0, len(samples), count + 1, dtype=int)
    peaks = np.maximum.reduceat(np.abs(samples), bins[:-1])
    scale = max(float(np.quantile(peaks, .995)), 1e-6)
    return np.rint(np.sqrt(np.clip(peaks / scale, 0, 1)) * 255).astype('uint8').tolist()

def heading_anchor(page, hint):
    rgb = np.array(Image.open(f'tmp/workbooks-2025/{code}/{page:04d}.webp').convert('RGB'))
    height, width = rgb.shape[:2]
    labels, _ = ndi.label(np.max(rgb, axis=2) < 115)
    candidates = []
    for index, box in enumerate(ndi.find_objects(labels)):
        if box is None: continue
        y, x = box[0].start, box[1].start
        hh, ww = box[0].stop - y, box[1].stop - x
        if not (.075 * width <= x <= .15 * width and .055 * height < y < .94 * height and .008 * height <= hh <= .026 * height and .0015 * width <= ww <= .009 * width): continue
        glyph = labels[box] == index + 1
        left = glyph[:, :max(1, ww // 3)].any(axis=1).mean()
        right = glyph[:, -max(1, ww // 3):].any(axis=1).mean()
        top = glyph[:max(2, hh // 5)].any(axis=0).mean()
        bottom = glyph[-max(2, hh // 5):].any(axis=0).mean()
        if left > .85 and right < .45 and top > .75 and bottom > .75:
            candidates.append(dict(x=x / width, y=(y + hh / 2) / height, box=[int(x), int(y), int(ww), int(hh)]))
    if not candidates: raise ValueError(f'No printed bracket on page {page}')
    best = min(candidates, key=lambda candidate: abs(candidate['y'] - hint))
    if page == 11 and abs(hint - .455) < .001:
        # This printed heading is "2." rather than a bracketed question range.
        digit_candidates = []
        for box in ndi.find_objects(labels):
            if box is None: continue
            y, x = box[0].start, box[1].start
            hh, ww = box[0].stop - y, box[1].stop - x
            center = (y + hh / 2) / height
            if .09 * width <= x <= .13 * width and abs(center - hint) < .025 and .008 * height <= hh <= .026 * height and .003 * width <= ww <= .022 * width:
                digit_candidates.append(dict(x=x / width, y=center, box=[int(x), int(y), int(ww), int(hh)]))
        if not digit_candidates: raise ValueError('Missing printed heading 2 on page 11')
        best = min(digit_candidates, key=lambda candidate: abs(candidate['y'] - hint))
    if abs(best['y'] - hint) > .05: raise ValueError(f'Heading too far from reviewed position: p{page} hint={hint}, candidates={candidates}')
    return best

all_groups, anchors = {}, {}
for track in tracks:
    key = track['key']
    directory = root / key
    transcript = json.loads((directory / 'transcript.json').read_text(encoding='utf-8'))
    bilingual = json.loads((directory / 'bilingual.json').read_text(encoding='utf-8'))
    checksum = hashlib.sha256(Path(track['source_path']).read_bytes()).hexdigest()
    if transcript['provider'] != 'elevenlabs' or transcript['sourceChecksum'] != checksum or bilingual['sourceChecksum'] != checksum: raise ValueError('Source provenance mismatch')
    segments = bilingual['segments']
    words = [w for w in transcript['words'] if w['type'] == 'word' and w['text'].strip()]
    audio = sosfilt(butter(3, 65, fs=rate, btype='highpass', output='sos'), decode(track['indexed_file']).astype(float))
    boundaries = [dict(time=0, method='preserve_recording_start', bell=None)]
    for index, *_ in plans[key][1:]:
        boundaries.append(cut_boundary(audio, segments[index]['start'], segments[index - 1]['end']))
    groups, covered = [], []
    for order, (segment_index, first, last, page, hint, instruction) in enumerate(plans[key]):
        start = boundaries[order]['time']
        end = boundaries[order + 1]['time'] if order + 1 < len(boundaries) else track['duration']
        selected = [(i, w) for i, w in enumerate(words) if start <= w['start'] < end]
        if not selected or any(w['end'] > end + .025 for _, w in selected): raise ValueError('Cut intersects recognized speech')
        covered += [i for i, _ in selected]
        first_word, last_word = selected[0][0], selected[-1][0]
        speech = [s for s in segments if s['firstWord'] >= first_word and s['lastWord'] <= last_word]
        if sum(s['lastWord'] - s['firstWord'] + 1 for s in speech) != len(selected): raise ValueError('Bilingual text crosses group boundary')
        anchor = heading_anchor(page, hint)
        anchors[f'{code}:{page}:{first}'] = dict(x=round(anchor['x'], 7), y=round(anchor['y'], 7))
        filename = f'{key}-questions-{first}-{last}.mp3'
        file = directory / filename
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-i', track['indexed_file'], '-t', str(end - start), '-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-ar', '44100', '-b:a', '128k', str(file)])
        encoded = duration(file)
        if abs(encoded - (end - start)) > .15: raise ValueError('Encoded clip duration mismatch')
        clip_samples = decode(file)
        reference = decode(track['indexed_file'])[round(start * rate):round(start * rate) + len(clip_samples)]
        n = min(len(reference), len(clip_samples))
        if n < 100 or np.sqrt(np.mean(clip_samples ** 2)) < .001: raise ValueError('Empty or silent clip')
        correlation = float(np.corrcoef(reference[:n], clip_samples[:n])[0, 1])
        if correlation < .85: raise ValueError(f'Clip waveform differs from source: {key} {first}: {correlation}')
        notes = [s['review_note'] for s in speech if s.get('review_note')]
        text_vi = '\n'.join(s['text_vi'] for s in speech)
        if key == 'hangul-2-b': text_vi = 'File gốc đánh số 1–21; tương ứng câu 16–36 trong sách.\n\n' + text_vi
        group = dict(key=key, sourceChecksum=checksum, start=start, end=end, startQ=first, endQ=last, pageNumber=page, anchorY=anchor['y'], instruction=instruction, headingBox=anchor['box'], file=file.as_posix(), clipChecksum=hashlib.sha256(file.read_bytes()).hexdigest(), encodedDuration=encoded, firstWord=first_word, lastWord=last_word, text_ko=' '.join(w['text'].strip() for _, w in selected), text_vi=text_vi, uncertain=any(s['uncertain'] for s in speech), reviewNotes=notes, waveform=envelope(file, 2048), boundary=boundaries[order], waveformCorrelation=correlation)
        groups.append(group)
        file.with_suffix('.ko-vi.txt').write_text(group['text_ko'] + '\n\n' + text_vi, encoding='utf-8')
    if covered != list(range(len(words))): raise ValueError('Recognized speech lost or repeated')
    all_groups[key] = groups
    print(f'{key}: {len(groups)} groups, all {len(words)} words covered once; waveform/duration verified', flush=True)

units = []
for unit_number, key, keys, title in [(-2, 'hangul-1', ['hangul-1'], 'Làm quen với Hangeul I'), (-1, 'hangul-2', ['hangul-2-a', 'hangul-2-b'], 'Làm quen với Hangeul II'), (0, 'greetings', ['greetings'], 'Chào hỏi')]:
    directory = root / key
    directory.mkdir(exist_ok=True)
    full = directory / 'full.mp3'
    if len(keys) == 1:
        full.write_bytes(Path(by_key[keys[0]]['indexed_file']).read_bytes())
    else:
        run(['ffmpeg', '-v', 'error', '-y', '-i', by_key[keys[0]]['indexed_file'], '-i', by_key[keys[1]]['indexed_file'], '-filter_complex', '[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a0];[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a1];[a0][a1]concat=n=2:v=0:a=1[out]', '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '128k', str(full)])
    full_duration = duration(full)
    offsets, offset, groups = {}, 0, []
    for source_key in keys:
        offsets[source_key] = offset
        for group in all_groups[source_key]: groups.append({**group, 'timelineStart': group['start'] + offset, 'timelineEnd': group['end'] + offset})
        offset += len(decode(by_key[source_key]['indexed_file'], sample_rate=44100, channels=2)) / (44100 * 2)
    source_checksums = [by_key[k]['source_checksum'] for k in keys]
    source_checksum = source_checksums[0] if len(keys) == 1 else hashlib.sha256('|'.join(source_checksums).encode()).hexdigest()
    unit = dict(key=key, unit_number=unit_number, title=title, sourceChecksum=source_checksum, sourceFiles=[by_key[k]['source_file'] for k in keys], sourceChecksums=source_checksums, fullFile=full.as_posix(), fullChecksum=hashlib.sha256(full.read_bytes()).hexdigest(), duration=max(full_duration, groups[-1]['timelineEnd']), measuredFullDuration=full_duration, waveform=envelope(full, 4096), sourceOffsets=offsets, groups=groups)
    if abs(full_duration - groups[-1]['timelineEnd']) > .15: raise ValueError('Joined timeline duration mismatch')
    units.append(unit)
(root / 'prepared.json').write_text(json.dumps(dict(units=units, checks=dict(sourceChecksumsVerified=True, allWordsCoveredExactlyOnce=True, noSpeechCrossesCuts=True, clipDurationsVerified=True, sourceWaveformsCorrelated=True, printedHeadingAnchorsMeasured=True)), ensure_ascii=False, indent=2), encoding='utf-8')
if args.write_anchors:
    anchor_path = Path('src/lib/textbooks/workbook-listening-anchors.json')
    current = json.loads(anchor_path.read_text(encoding='utf-8'))
    for key, value in anchors.items():
        if key in current and current[key] != value: raise ValueError(f'Existing anchor would change: {key}')
    current.update(anchors)
    anchor_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
Path('reports/workbook-intro-audio-preparation.json').write_text(json.dumps(dict(tracks=len(tracks), units=len(units), groups=sum(len(u['groups']) for u in units), sourceDuration=sum(t['duration'] for t in tracks), anchors=anchors, checks=dict(allWordsCoveredExactlyOnce=True, noSpeechCrossesCuts=True, clipDurationsVerified=True, sourceWaveformsCorrelated=True)), ensure_ascii=False, indent=2), encoding='utf-8')
