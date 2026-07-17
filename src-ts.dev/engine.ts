// src/engine.ts

let audioCtx: AudioContext | null = null;

// Audio Graph Nodes
let sourceNode: AudioBufferSourceNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let convolverNode: ConvolverNode | null = null;
let dryGainNode: GainNode | null = null;
let wetGainNode: GainNode | null = null;
let masterGain: GainNode | null = null;

let currentBuffer: AudioBuffer | null = null;
let isPlaying = false;

// Initialize AudioContext
export function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    setupGraph();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Generate a synthetic impulse response for reverb
function createImpulseResponse(ctx: BaseAudioContext, duration: number, decay: number, reverse: boolean = false) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = reverse ? length - i : i;
    left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
  }
  return impulse;
}

// Set up the persistent effects graph
function setupGraph() {
  if (!audioCtx) return;
  
  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.value = 1.0;

  // Filter
  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 1000;

  // Reverb setup (Parallel dry/wet path)
  convolverNode = audioCtx.createConvolver();
  convolverNode.buffer = createImpulseResponse(audioCtx, 2.0, 2.0);
  
  dryGainNode = audioCtx.createGain();
  wetGainNode = audioCtx.createGain();
  
  dryGainNode.gain.value = 1.0;
  wetGainNode.gain.value = 0.3; // 30% wet by default

  // Routing:
  // Source -> Filter
  // Filter -> dryGain -> masterGain
  // Filter -> convolver -> wetGain -> masterGain
  
  filterNode.connect(dryGainNode);
  dryGainNode.connect(masterGain);
  
  filterNode.connect(convolverNode);
  convolverNode.connect(wetGainNode);
  wetGainNode.connect(masterGain);
}

export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  initAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  currentBuffer = await audioCtx!.decodeAudioData(arrayBuffer);
  return currentBuffer;
}

export function play() {
  if (!audioCtx || !currentBuffer || !filterNode) return;
  if (isPlaying) stop();
  
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = currentBuffer;
  sourceNode.connect(filterNode);
  
  sourceNode.start();
  isPlaying = true;
  
  sourceNode.onended = () => {
    isPlaying = false;
  };
}

export function stop() {
  if (sourceNode && isPlaying) {
    sourceNode.stop();
    sourceNode.disconnect();
    isPlaying = false;
  }
}

// Effect Controls
export function setFilterFrequency(freq: number) {
  if (filterNode) {
    // Ramp to prevent clicks
    filterNode.frequency.setTargetAtTime(freq, audioCtx!.currentTime, 0.05);
  }
}

export function setFilterEnabled(enabled: boolean) {
  if (filterNode && audioCtx) {
    // If disabled, set frequency very high so it doesn't affect the sound
    const targetFreq = enabled ? 1000 : 20000; // Will be overridden by slider immediately anyway
    filterNode.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.05);
  }
}

export function setReverbMix(mixPercent: number) {
  if (dryGainNode && wetGainNode && audioCtx) {
    const fraction = mixPercent / 100;
    // Constant power crossfade
    const dry = Math.cos(fraction * 0.5 * Math.PI);
    const wet = Math.cos((1.0 - fraction) * 0.5 * Math.PI);
    
    dryGainNode.gain.setTargetAtTime(dry, audioCtx.currentTime, 0.05);
    wetGainNode.gain.setTargetAtTime(wet, audioCtx.currentTime, 0.05);
  }
}

export function setReverbEnabled(enabled: boolean) {
  if (dryGainNode && wetGainNode && audioCtx) {
    if (enabled) {
      // Restore from slider (this will be handled by UI triggering the slider event)
    } else {
      dryGainNode.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.05);
      wetGainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.05);
    }
  }
}

// Export processing
export async function exportWav(): Promise<Blob | null> {
  if (!currentBuffer) return null;
  
  const offlineCtx = new OfflineAudioContext(
    currentBuffer.numberOfChannels,
    currentBuffer.length,
    currentBuffer.sampleRate
  );

  // Re-create the graph in the offline context
  const offlineSource = offlineCtx.createBufferSource();
  offlineSource.buffer = currentBuffer;
  
  const offlineFilter = offlineCtx.createBiquadFilter();
  offlineFilter.type = filterNode!.type;
  offlineFilter.frequency.value = filterNode!.frequency.value;
  
  const offlineDry = offlineCtx.createGain();
  const offlineWet = offlineCtx.createGain();
  offlineDry.gain.value = dryGainNode!.gain.value;
  offlineWet.gain.value = wetGainNode!.gain.value;
  
  const offlineConvolver = offlineCtx.createConvolver();
  offlineConvolver.buffer = convolverNode!.buffer;

  // Route
  offlineSource.connect(offlineFilter);
  offlineFilter.connect(offlineDry);
  offlineDry.connect(offlineCtx.destination);
  
  offlineFilter.connect(offlineConvolver);
  offlineConvolver.connect(offlineWet);
  offlineWet.connect(offlineCtx.destination);

  offlineSource.start();
  const renderedBuffer = await offlineCtx.startRendering();
  
  return audioBufferToWav(renderedBuffer);
}

// Simple AudioBuffer to WAV encoder
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * (bitDepth / 8);
  const arrayBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

function interleave(lChannel: Float32Array, rChannel: Float32Array): Float32Array {
  const length = lChannel.length + rChannel.length;
  const result = new Float32Array(length);
  let inputIndex = 0;
  for (let index = 0; index < length; ) {
    result[index++] = lChannel[inputIndex];
    result[index++] = rChannel[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}
