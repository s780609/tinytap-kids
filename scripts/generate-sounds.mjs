/**
 * Generate placeholder audio files for TinyTap Kids.
 * Uses simple sine wave tones to create recognizable audio cues.
 * These can be replaced with real recordings later.
 *
 * Run: node scripts/generate-sounds.mjs
 */

import { writeFileSync, mkdirSync } from "fs";

// WAV file generator helper
function generateWav(sampleRate, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), headerSize + i * 2);
  }

  return buffer;
}

function tone(freq, duration, sampleRate = 22050, volume = 0.5) {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float64Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, (numSamples - i) / (sampleRate * 0.05)); // fade out
    samples[i] = Math.sin(2 * Math.PI * freq * t) * volume * envelope;
  }
  return samples;
}

function concat(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Float64Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function silence(duration, sampleRate = 22050) {
  return new Float64Array(Math.floor(sampleRate * duration));
}

function noise(duration, sampleRate = 22050, volume = 0.3) {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float64Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const envelope = Math.exp(-i / (numSamples * 0.2));
    samples[i] = (Math.random() * 2 - 1) * volume * envelope;
  }
  return samples;
}

function saveWav(path, samples) {
  const wav = generateWav(22050, Array.from(samples));
  writeFileSync(path, wav);
  console.log(`Created: ${path}`);
}

// Ensure directories
mkdirSync("public/sounds/animals", { recursive: true });
mkdirSync("public/sounds/voices", { recursive: true });
mkdirSync("public/sounds/feedback", { recursive: true });

// === Animal sounds (simplified tonal representations) ===

// Cat - high pitched meow pattern
saveWav(
  "public/sounds/animals/cat.mp3",
  concat(
    tone(800, 0.15),
    tone(600, 0.1),
    silence(0.05),
    tone(900, 0.2),
    tone(700, 0.15)
  )
);

// Dog - bark pattern (short sharp tones)
saveWav(
  "public/sounds/animals/dog.mp3",
  concat(
    tone(300, 0.1, 22050, 0.7),
    silence(0.05),
    tone(350, 0.1, 22050, 0.7),
    silence(0.1),
    tone(300, 0.12, 22050, 0.6)
  )
);

// Cow - low moo
saveWav(
  "public/sounds/animals/cow.mp3",
  concat(tone(150, 0.4, 22050, 0.6), tone(130, 0.5, 22050, 0.5))
);

// Duck - quack pattern
saveWav(
  "public/sounds/animals/duck.mp3",
  concat(
    tone(500, 0.08, 22050, 0.6),
    noise(0.04),
    silence(0.08),
    tone(520, 0.08, 22050, 0.6),
    noise(0.04)
  )
);

// Lion - low roar
saveWav(
  "public/sounds/animals/lion.mp3",
  concat(
    tone(100, 0.2, 22050, 0.7),
    tone(120, 0.3, 22050, 0.8),
    tone(90, 0.4, 22050, 0.6),
    noise(0.2, 22050, 0.2)
  )
);

// Elephant - trumpet sound (rising tone)
saveWav(
  "public/sounds/animals/elephant.mp3",
  (() => {
    const sr = 22050;
    const dur = 0.8;
    const n = Math.floor(sr * dur);
    const samples = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const freq = 200 + (t / dur) * 400; // rising from 200 to 600
      const envelope =
        Math.sin((t / dur) * Math.PI) * 0.6; // bell envelope
      samples[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
    }
    return samples;
  })()
);

// === Voice clips (musical chime patterns as placeholders) ===

// "Wow!" - ascending two-note chime
saveWav(
  "public/sounds/voices/wow.mp3",
  concat(tone(523, 0.15), tone(784, 0.25))
);

// "Great job!" / 好棒 - happy ascending scale
saveWav(
  "public/sounds/voices/great-job.mp3",
  concat(
    tone(523, 0.12),
    tone(659, 0.12),
    tone(784, 0.12),
    tone(1047, 0.3)
  )
);

// Shape voice clips - distinctive chime + identifier tone
const shapeFreqs = {
  circle: [440, 660],
  square: [330, 550],
  triangle: [392, 588],
  star: [523, 784],
  heart: [494, 740],
};

for (const [shape, freqs] of Object.entries(shapeFreqs)) {
  saveWav(
    `public/sounds/voices/this-is-${shape}.mp3`,
    concat(
      tone(freqs[0], 0.15),
      silence(0.05),
      tone(freqs[1], 0.25),
      silence(0.05),
      tone(freqs[0], 0.1),
      tone(freqs[1], 0.2)
    )
  );
}

// === Feedback sounds ===

// Laugh - bubbly ascending notes
saveWav(
  "public/sounds/feedback/laugh.mp3",
  concat(
    tone(400, 0.08),
    tone(500, 0.08),
    tone(600, 0.08),
    silence(0.05),
    tone(450, 0.08),
    tone(550, 0.08),
    tone(700, 0.12)
  )
);

// Clap - short noise bursts
saveWav(
  "public/sounds/feedback/clap.mp3",
  concat(
    noise(0.04, 22050, 0.6),
    silence(0.12),
    noise(0.04, 22050, 0.6),
    silence(0.12),
    noise(0.04, 22050, 0.6)
  )
);

console.log("\nAll sound files generated successfully!");
console.log("Note: These are placeholder tonal sounds.");
console.log("Replace with real recordings for production use.");
