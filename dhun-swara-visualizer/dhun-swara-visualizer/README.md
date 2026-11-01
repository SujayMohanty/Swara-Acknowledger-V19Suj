# Dhun · Swara Visualizer  (v1.0)

Turns a song into an animated swara view: a pitch contour over a swara ladder, the sargam letters of each phrase,
a male / female colour for each voice, the raag and Sa, and the taal beat cycle. Everything runs in your browser.
Nothing is uploaded.

## Run it
1. Unzip the folder.
2. Double-click `index.html` (Chrome, Edge or Firefox recommended).
3. Choose a song (mp3, wav, m4a, ogg, or a video file with audio). Analysis starts at once.
4. Press **PLAY** (or `Space`). `←` / `→` seek 5 seconds.

Internet is only needed for the two Google fonts (Noto Sans Devanagari, Space Mono). Without it the app still works
with your system fonts, but check that your system has a Devanagari font.

## What it does
| Feature | How |
|---|---|
| Pitch tracking | Spectral whitening, harmonic salience on a 10-cent grid (Deep) or 20-cent grid (Fast), then a Viterbi path so the melody stays on one voice |
| All 12 swaras | Sa, komal Re, Re, komal Ga, Ga, Ma, tivra Ma, Pa, komal Dha, Dha, komal Ni, Ni, in three octaves (mandra, madhya, taar) |
| Just-intonation ratios | Each note is snapped to its textbook ratio (Ga = 5:4, Dha = 5:3, ...) and the ratio is shown in the Wave view |
| Singer intonation | A second pass shifts each swara by up to 35 cents to where this singer actually sings it, then snaps again |
| Gamaka / vibrato | Short wobbles and glides are folded into the main note instead of becoming extra swaras. Weak, unsteady notes are dropped |
| Sa and Raag | Detected from sustained notes, phrase endings and each raag's vadi, then re-checked on 8 slices of the song. Agreement gives the confidence score |
| Raags known | Bihag, Yaman (Kalyani), Bilawal (Sankarabharanam), Khamaj, Kafi (Kharaharapriya), Asavari (Natabhairavi), Bhairavi (Hanumatodi), Bhairav (Mayamalavagowla), Todi, Marwa, Purvi, Pilu |
| Male / female | Notes are grouped by pitch register into two clusters, then smoothed so a singer does not flip mid-phrase. Cyan = male, pink = female. Override with the **Voices** menu |
| Octave labels | In a duet the higher voice defines madhya. Use **Octave labels** to shift by one octave |
| Taal | Beat tracking plus cycle detection (Dadra 6, Rupak 7, Keherwa 8, Jhaptal 10, Ektal 12, Deepchandi 14, Teentaal 16). Shown as a matra row with SAM marked |
| Export video | **EXPORT VIDEO** records the 720×1280 animation plus the song audio to a `.webm` in real time |
| Export JSON | **EXPORT JSON** saves every swara with start and end time, octave, ratio, voice and confidence, plus Sa, raag, taal and confidence scores |

## Reading the numbers
The percentages are measured agreement, not a guarantee. They rise with song length (Sa and Raag are re-estimated on
8 slices, so a 20-second clip scores low even when the answer is right). If a number is under about 70%, look at the
"Also close" line and set **Sa** or **Raag** yourself. The view updates instantly.

## Tested against
* Ghar More Pardesiya (demo audio): Sa = E, Raag Bihag.
* Mere Dholna (demo audio): Sa = D#, male and female voices and octaves matched the on-screen ratios.
* A synthetic male and female duet with vibrato and stray notes: all 64 swaras in order, correct Sa, raag and voices.

## Known limits
* The tracker follows one melody at a time. Notes sung by both singers together get a single voice.
* Heavy instruments, harmonium or strong backing vocals can pull the tracker off the singer. Vocal-forward recordings are best.
* Only the 12 raags above are matched. Other songs map to the closest one. Choose another manually if you know it.
* Taal is an estimate and can confuse an 8-beat cycle with a 16-beat one.
* Video export needs a browser with MediaRecorder (Chrome, Edge, Firefox). Audio capture is not available in Safari.
* Recording runs in real time, so a 4-minute song takes 4 minutes to export.

## Files
```
index.html     page layout
css/style.css  styles
js/app.js      analysis, rendering and exports (no dependencies)
```
