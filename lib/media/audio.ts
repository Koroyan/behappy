/**
 * Voice input (record → transcribe) and read-aloud (text → speech), both via
 * the BeHappy server. Web records with MediaRecorder; native records and
 * plays with expo-audio (expo-av was removed from Expo SDK 55 on).
 */
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { aiSpeech, aiTranscribe } from '@/lib/api/ai';

export class MicPermissionError extends Error {}
export class VoiceUnsupportedError extends Error {}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  // Native recorder. Creating it does not open the microphone; recording starts in start().
  const nativeRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const nativeActive = useRef(false);
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
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new MicPermissionError();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await nativeRecorder.prepareToRecordAsync();
    nativeRecorder.record();
    nativeActive.current = true;
    setRecording(true);
  }, [nativeRecorder]);

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
    if (!nativeActive.current) return null;
    nativeActive.current = false;
    await nativeRecorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const uri = nativeRecorder.uri;
    return uri ? { uri, mime: 'audio/mp4' } : null;
  }, [nativeRecorder]);

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

let currentPlayer: AudioPlayer | null = null;
let finishCurrent: (() => void) | null = null;
/** A spoken reply is at most 2000 characters; never wait longer than this for it to end. */
const MAX_PLAYBACK_MS = 4 * 60 * 1000;

export async function stopSpeaking() {
  const player = currentPlayer;
  const finish = finishCurrent;
  currentPlayer = null;
  finishCurrent = null;
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {
      // already stopped
    }
  }
  finish?.();
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
  if (Platform.OS !== 'web') await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  const player = createAudioPlayer({ uri });
  currentPlayer = player;
  try {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, MAX_PLAYBACK_MS);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      finishCurrent = done;
      const sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          sub.remove();
          done();
        }
      });
      player.play();
    });
  } finally {
    if (currentPlayer === player) {
      currentPlayer = null;
      finishCurrent = null;
      try {
        player.remove();
      } catch {
        // ignore
      }
    }
    cleanup();
  }
}
