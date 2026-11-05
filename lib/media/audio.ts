/**
 * Voice input (record → transcribe) and read-aloud (text → speech), both via
 * the BeHappy server. Web uses MediaRecorder; native uses expo-av.
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { aiSpeech, aiTranscribe } from '@/lib/api/ai';

export class MicPermissionError extends Error {}
export class VoiceUnsupportedError extends Error {}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const nativeRef = useRef<Audio.Recording | null>(null);
  const webRef = useRef<{ recorder: any; chunks: BlobPart[]; stream: MediaStream } | null>(null);

  const start = useCallback(async () => {
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (!nav?.mediaDevices?.getUserMedia || typeof (globalThis as any).MediaRecorder === 'undefined') throw new VoiceUnsupportedError();
      let stream: MediaStream;
      try {
        stream = await nav.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new MicPermissionError();
      }
      const MR = (globalThis as any).MediaRecorder;
      const mime = MR.isTypeSupported?.('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MR.isTypeSupported?.('audio/mp4') ? 'audio/mp4' : '';
      const recorder = mime ? new MR(stream, { mimeType: mime }) : new MR(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e: any) => e.data && e.data.size > 0 && chunks.push(e.data);
      recorder.start();
      webRef.current = { recorder, chunks, stream };
      setRecording(true);
      return;
    }
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) throw new MicPermissionError();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    nativeRef.current = rec;
    setRecording(true);
  }, []);

  /** Stops and returns { uri, mime } of the recording, or null if nothing was recorded. */
  const stop = useCallback(async (): Promise<{ uri: string; mime: string } | null> => {
    setRecording(false);
    if (Platform.OS === 'web') {
      const ref = webRef.current;
      webRef.current = null;
      if (!ref) return null;
      const done = new Promise<void>((resolve) => {
        ref.recorder.onstop = () => resolve();
      });
      ref.recorder.stop();
      await done;
      ref.stream.getTracks().forEach((t) => t.stop());
      const type = (ref.recorder.mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(ref.chunks, { type });
      if (!blob.size) return null;
      return { uri: URL.createObjectURL(blob), mime: type };
    }
    const rec = nativeRef.current;
    nativeRef.current = null;
    if (!rec) return null;
    await rec.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    const uri = rec.getURI();
    return uri ? { uri, mime: 'audio/mp4' } : null;
  }, []);

  return { recording, start, stop };
}

export async function transcribeRecording(uri: string, mime: string, language?: string): Promise<string> {
  let base64 = '';
  let fileName = 'audio.m4a';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.readAsDataURL(blob);
    });
    fileName = mime.includes('webm') ? 'audio.webm' : mime.includes('mp4') ? 'audio.m4a' : 'audio.webm';
    URL.revokeObjectURL(uri);
  } else {
    base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  return aiTranscribe(base64, mime, fileName, language && /^[a-z]{2}$/.test(language) ? language : undefined);
}

let currentSound: Audio.Sound | null = null;

export async function stopSpeaking() {
  const s = currentSound;
  currentSound = null;
  if (s) {
    try {
      await s.stopAsync();
      await s.unloadAsync();
    } catch {
      // already stopped
    }
  }
}

/** Reads text aloud. Resolves when playback ends or is stopped. */
export async function speakText(text: string, language: string): Promise<void> {
  await stopSpeaking();
  const voice = language === 'en' ? 'alloy' : 'marin';
  const buf = await aiSpeech(text.slice(0, 2000), voice);
  let uri: string;
  let cleanup = () => {};
  if (Platform.OS === 'web') {
    uri = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
    cleanup = () => URL.revokeObjectURL(uri);
  } else {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    const b64 = (globalThis as any).btoa(binary);
    uri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
    cleanup = () => {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    };
  }
  const sound = new Audio.Sound();
  currentSound = sound;
  try {
    await sound.loadAsync({ uri });
    await sound.playAsync();
    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (!status?.isLoaded || status?.didJustFinish) resolve();
      });
    });
  } finally {
    if (currentSound === sound) currentSound = null;
    try {
      await sound.unloadAsync();
    } catch {
      // ignore
    }
    cleanup();
  }
}
