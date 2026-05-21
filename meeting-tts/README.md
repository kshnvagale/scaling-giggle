# TTS input — Helix Cloud Q2 kickoff meeting

Four TTS-ready blocks (one per persona) for the kickoff meeting script. Each block contains that persona's lines in **turn-number order**, separated by `<break time="2s" />` SSML tags.

## File map

| File | Persona | Voice | Turns | Total ~sec |
|---|---|---|---|---|
| `sam.txt` | Sam Iyer (host) | Calm, helpful, organized. Mid-pitch, warm. Slight Indian-American cadence. | 10 | ~92 |
| `maya.txt` | Maya Chen (CRO) | Crisp, numeric, slightly defensive. Faster cadence, lower warmth. | 10 | ~69 |
| `jordan.txt` | Jordan Park (VP CS) | Warm, direct, a little worried. Sentences trail slightly. | 7 | ~66 |
| `alex.txt` | Alex Okafor (Head of Product) | Curious, analytical, up-pitched questions. Conversational. | 5 | ~39 |

## How to use

### If you're using ElevenLabs

1. Pick a voice that matches the direction in the table above.
2. Open the `.txt` file and paste the **entire contents** (including the `<break time="2s" />` tags) into the prompt box. ElevenLabs honors SSML `<break>` tags natively and will insert real silence.
3. Render and save the output as `sam.mp3`, `maya.mp3`, `jordan.mp3`, `alex.mp3` respectively.
4. Drop the four files into `/Users/kshnvagale/Documents/Ai/Scaler/CaseForge/game/runtime/public/audio/meeting/raw/`.

### If you're using OpenAI TTS, Murf, Resemble, or HeyGen voice (no SSML)

The `<break time="2s" />` tags won't render as silence. Two options:

- **Search-and-replace** every `<break time="2s" />` in the .txt with literal silence padding — most TTS tools insert ~0.5s pause per blank line, so replace each break tag with two blank lines and trailing periods on the previous sentence. Then add explicit silence in post.
- **Easier:** use ElevenLabs for these four voices. Free tier handles this volume.

### Voice-cloning / HeyGen Anshuman-style cloned voices

If you're cloning four real voices (e.g., from your team), feed them the `.txt` files as-is. Most cloning tools (HeyGen, Cartesia, Vapi) honor SSML break tags. Anything that doesn't, fall back to the blank-line approach.

## Quality control — read these before rendering

1. **Order matters.** Each file's lines must come out in the order written (turns 1, 2, 4, 6, 11, 20, 22, 24, 28, 32 for Sam, etc.). Do not reorder.
2. **Silence between turns must be ≥1.5s.** The 2s `<break>` is the safety margin. If your tool produces shorter silences, bump to `<break time="3s" />`.
3. **No silence ≥1.5s inside a single turn.** If a turn has long sentences, the TTS may pause noticeably — that's fine as long as it's under 1.5s. If you hear a long mid-sentence pause that could be mistaken for a turn boundary, re-render that turn.
4. **Tone is conversational, not announcer-y.** "Yeah", "okay", "right" should sound natural, not enunciated.
5. **Numbers** like "nine and a half million", "three point four x", "eighteen percent" are written phonetically — your TTS should pronounce them as English words, not as digits. Verify the first render.

## After you have the four files

Drop them at the path above and ping me with **"audio ready."** I'll then:

1. Run `ffmpeg silencedetect` on each file to find the 2s gaps.
2. Cut each file into individual turn clips.
3. Verify cut counts match: Sam=10, Maya=10, Jordan=7, Alex=5.
4. Stitch all 32 clips into one `meeting.mp3` in conversation order.
5. Wire the recording into `course-package.json` as a `MeetingRecording` with full segment metadata.
