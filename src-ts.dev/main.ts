import './style.css';
import { 
  loadAudioFile, 
  play, 
  stop, 
  setFilterFrequency, 
  setFilterEnabled, 
  setReverbMix, 
  setReverbEnabled, 
  exportWav 
} from './engine';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="app-container">
    <header class="glass-header">
      <h1>wq.tool</h1>
      <p>Isomorphic Sound Design Engine</p>
    </header>
    
    <main>
      <div id="dropzone" class="dropzone glass-panel">
        <div class="drop-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <p>Drop a .wav file here or click to upload</p>
          <input type="file" id="fileInput" accept=".wav" style="display: none;" />
        </div>
      </div>

      <div class="workspace" id="workspace" style="display: none;">
        <div class="visualizer-container glass-panel">
          <canvas id="waveform" width="800" height="200"></canvas>
        </div>
        
        <div class="controls glass-panel">
          <div class="transport">
            <button id="playBtn" class="btn primary">Play</button>
            <button id="stopBtn" class="btn">Stop</button>
            <button id="exportBtn" class="btn secondary">Export .wav</button>
          </div>
          
          <div class="effects-rack">
            <h3>Effects Rack</h3>
            
            <div class="effect-module">
              <div class="effect-header">
                <h4>Lowpass Filter</h4>
                <label class="switch">
                  <input type="checkbox" id="filterToggle">
                  <span class="slider round"></span>
                </label>
              </div>
              <div class="knob-container">
                <label for="filterFreq">Frequency</label>
                <input type="range" id="filterFreq" min="100" max="10000" value="1000" class="styled-slider">
                <span id="filterFreqVal">1000 Hz</span>
              </div>
            </div>

            <div class="effect-module">
              <div class="effect-header">
                <h4>Reverb</h4>
                <label class="switch">
                  <input type="checkbox" id="reverbToggle">
                  <span class="slider round"></span>
                </label>
              </div>
              <div class="knob-container">
                <label for="reverbMix">Mix</label>
                <input type="range" id="reverbMix" min="0" max="100" value="30" class="styled-slider">
                <span id="reverbMixVal">30%</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  </div>
`;

// Logic
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const workspace = document.getElementById('workspace');

dropzone?.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    await loadAudioFile(target.files[0]);
    dropzone!.style.display = 'none';
    workspace!.style.display = 'grid';
  }
});

document.getElementById('playBtn')?.addEventListener('click', play);
document.getElementById('stopBtn')?.addEventListener('click', stop);
document.getElementById('exportBtn')?.addEventListener('click', async () => {
  const blob = await exportWav();
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported-sound.wav';
    a.click();
    URL.revokeObjectURL(url);
  }
});

document.getElementById('filterToggle')?.addEventListener('change', (e) => {
  setFilterEnabled((e.target as HTMLInputElement).checked);
});

document.getElementById('filterFreq')?.addEventListener('input', (e) => {
  const val = (e.target as HTMLInputElement).value;
  setFilterFrequency(parseFloat(val));
  document.getElementById('filterFreqVal')!.textContent = `${val} Hz`;
});

document.getElementById('reverbToggle')?.addEventListener('change', (e) => {
  setReverbEnabled((e.target as HTMLInputElement).checked);
});

document.getElementById('reverbMix')?.addEventListener('input', (e) => {
  const val = (e.target as HTMLInputElement).value;
  setReverbMix(parseFloat(val) / 100);
  document.getElementById('reverbMixVal')!.textContent = `${val}%`;
});
