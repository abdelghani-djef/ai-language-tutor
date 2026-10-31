"use client";

import { LANGUAGES } from './languages';

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, langCode: string): void {
  if (!speechSupported || !text) return;
  const tag = LANGUAGES[langCode]?.speech ?? langCode;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = tag;
  const prefix = tag.split('-')[0];
  const voice = speechSynthesis.getVoices().find((v) => v.lang === tag || v.lang.startsWith(prefix));
  if (voice) u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
