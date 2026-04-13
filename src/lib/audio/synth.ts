export function playPop(ctx: AudioContext, gain: GainNode) {
  const bufferSize = ctx.sampleRate * 0.06;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800;
  filter.Q.value = 1;

  source.connect(filter);
  filter.connect(gain);
  source.start();
}

export function playDing(ctx: AudioContext, gain: GainNode) {
  const osc = ctx.createOscillator();
  const envGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  envGain.gain.setValueAtTime(0.3, ctx.currentTime);
  envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(envGain);
  envGain.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playChime(ctx: AudioContext, gain: GainNode) {
  const notes = [1047, 1319]; // C6, E6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const startTime = ctx.currentTime + i * 0.12;
    envGain.gain.setValueAtTime(0.25, startTime);
    envGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc.connect(envGain);
    envGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

export function playWhoosh(ctx: AudioContext, gain: GainNode) {
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  filter.Q.value = 2;

  source.connect(filter);
  filter.connect(gain);
  source.start();
}

export function playSuccess(ctx: AudioContext, gain: GainNode) {
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const startTime = ctx.currentTime + i * 0.1;
    envGain.gain.setValueAtTime(0.2, startTime);
    envGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    osc.connect(envGain);
    envGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + 0.3);
  });
}

export function playBubble(ctx: AudioContext, gain: GainNode) {
  const osc = ctx.createOscillator();
  const envGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
  envGain.gain.setValueAtTime(0.25, ctx.currentTime);
  envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(envGain);
  envGain.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playWrong(ctx: AudioContext, gain: GainNode) {
  const osc = ctx.createOscillator();
  const envGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 220;
  envGain.gain.setValueAtTime(0.15, ctx.currentTime);
  envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(envGain);
  envGain.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}
