"use client";

import {
  playPop,
  playDing,
  playChime,
  playWhoosh,
  playSuccess,
  playBubble,
  playWrong,
} from "./synth";

class AudioManager {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private volume = 0.7;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.ctx.destination);
  }

  private ensureCtx() {
    if (!this.ctx || !this.gainNode) this.init();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.gainNode) this.gainNode.gain.value = v;
  }

  async preload(path: string) {
    if (this.audioCache.has(path)) return;
    this.ensureCtx();
    try {
      const res = await fetch(path);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
      this.audioCache.set(path, audioBuffer);
    } catch {
      // Audio file might not exist yet - that's ok
    }
  }

  async preloadAll() {
    const files = [
      "/sounds/animals/cat.mp3",
      "/sounds/animals/dog.mp3",
      "/sounds/animals/cow.mp3",
      "/sounds/animals/duck.mp3",
      "/sounds/animals/lion.mp3",
      "/sounds/animals/elephant.mp3",
      "/sounds/voices/wow.mp3",
      "/sounds/voices/great-job.mp3",
      "/sounds/voices/this-is-circle.mp3",
      "/sounds/voices/this-is-square.mp3",
      "/sounds/voices/this-is-triangle.mp3",
      "/sounds/voices/this-is-star.mp3",
      "/sounds/voices/this-is-heart.mp3",
      "/sounds/feedback/laugh.mp3",
      "/sounds/feedback/clap.mp3",
    ];
    await Promise.allSettled(files.map((f) => this.preload(f)));
  }

  async playFile(path: string) {
    this.ensureCtx();
    if (!this.audioCache.has(path)) {
      await this.preload(path);
    }
    const buffer = this.audioCache.get(path);
    if (!buffer || !this.ctx || !this.gainNode) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);
    source.start();
  }

  // Synth sounds
  pop() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playPop(this.ctx, this.gainNode);
  }

  ding() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playDing(this.ctx, this.gainNode);
  }

  chime() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playChime(this.ctx, this.gainNode);
  }

  whoosh() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playWhoosh(this.ctx, this.gainNode);
  }

  success() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playSuccess(this.ctx, this.gainNode);
  }

  bubble() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playBubble(this.ctx, this.gainNode);
  }

  wrong() {
    this.ensureCtx();
    if (this.ctx && this.gainNode) playWrong(this.ctx, this.gainNode);
  }
}

export const audioManager = new AudioManager();
