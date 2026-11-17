"""Inspect non-speech events preceding the six explicitly reviewed headings."""
import json
import subprocess
import sys
from pathlib import Path
import numpy as np

results = []
for lesson in (1, 2):
    root = Path(f"tmp/workbook-listening-elevenlabs/B{lesson}")
    source_data = json.loads((root / "segments.json").read_text(encoding="utf-8"))
    segments = source_data["segments"]
    groups = json.loads((root / "question-groups-pilot/report.json").read_text(encoding="utf-8"))["groups"]
    decoded = subprocess.run(["ffmpeg", "-v", "error", "-i", str(root / "reindexed-full.mp3"), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True)
    audio = np.frombuffer(decoded.stdout, dtype="<f4")
    for group in groups:
        heading = group["headingWordStart"]
        preceding = [segment for segment in segments if segment["end"] < heading - .1]
        previous_end = preceding[-1]["end"] if preceding else 0
        left = max(previous_end + .1 if preceding else 0, heading - 10)
        right = heading - .45
        hop = 160
        first, last = int(left * 16000), int(right * 16000)
        samples = audio[first:last]
        usable = len(samples) // hop * hop
        rms = np.sqrt(np.mean(samples[:usable].reshape(-1, hop) ** 2, axis=1))
        active = rms > 10 ** (-40 / 20)
        intervals = []
        start = None
        for i, value in enumerate(np.r_[active, False]):
            if value and start is None: start = i
            if not value and start is not None:
                if intervals and start * .01 + left - intervals[-1][1] < .08:
                    intervals[-1][1] = i * .01 + left
                else: intervals.append([start * .01 + left, i * .01 + left])
                start = None
        events = []
        for begin, end in intervals:
            if end - begin < .12: continue
            event = audio[int(begin * 16000):int(end * 16000)]
            power = np.abs(np.fft.rfft(event * np.hanning(len(event)))) ** 2
            frequencies = np.fft.rfftfreq(len(event), 1 / 16000)
            peak = int(np.argmax(power))
            tonal = float(power[np.abs(frequencies - frequencies[peak]) < 12].sum() / power.sum())
            events.append({"start": round(begin, 4), "end": round(end, 4), "peakHz": round(float(frequencies[peak]), 2), "peakEnergyFraction": round(tonal, 4)})
        bells = [event for event in events if 510 <= event["peakHz"] <= 540 and event["peakEnergyFraction"] >= .15 and .6 <= event["end"] - event["start"] <= 1.4]
        if len(bells) != 1:
            raise ValueError(f"B{lesson} {group['questions']}: ambiguous or missing bell")
        row = {"lesson": lesson, "sourceChecksum": source_data["sourceChecksum"], "questions": group["questions"], "heading": heading, "previousSpeechEnd": previous_end, "events": events, "bell": bells[0]}
        if "--verify-clips" in sys.argv:
            clip = subprocess.run(["ffmpeg", "-v", "error", "-i", str(root / "question-groups-pilot" / group["file"]), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True)
            clip_audio = np.frombuffer(clip.stdout, dtype="<f4")
            head = clip_audio[:int(1.4 * 16000)]
            spectrum = np.abs(np.fft.rfft(head * np.hanning(len(head)))) ** 2
            freq = np.fft.rfftfreq(len(head), 1 / 16000)
            peak_hz = float(freq[np.argmax(spectrum)])
            tail_rms = float(np.sqrt(np.mean(clip_audio[-960:] ** 2)))
            if not (510 <= peak_hz <= 540 and tail_rms < .01 and abs(group["start"] - (bells[0]["start"] - .1)) < .001):
                raise ValueError(f"B{lesson} {group['questions']}: exported bell or ending silence check failed")
            row["clipVerification"] = {"startsWithBell": True, "headPeakHz": round(peak_hz, 2), "endingSilenceRms": tail_rms, "endsBeforeNextBell": True}
        results.append(row)
Path("reports/workbook-pilot-bell-detection.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps(results, indent=2))
