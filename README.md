# wq.tool 🎛️

**wq.tool** is a real-time, browser-based sound design engine that leverages the native Web Audio API to manipulate and process `.wav` files without any backend dependencies.

Built with performance in mind, this project uses **Vanilla TypeScript** and **Vite** to bypass Virtual DOM overhead, allowing for lightning-fast, real-time audio parameter scrubbing directly in the browser.

## Features
- **Drag & Drop Import:** Easily load `.wav` files into the workspace.
- **Real-Time Effects:**
  - **Lowpass Filter:** Tweak the cutoff frequency dynamically.
  - **Reverb:** Apply algorithmic convolution reverb with a mix slider.
- **Offline Rendering & Export:** Process the audio file faster than real-time and export a high-quality `.wav` file with your effects baked in.

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository (or navigate to the project directory):
   ```bash
   cd wq.tool
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open the `localhost` URL provided in your terminal in a modern web browser.

## Tech Stack
- **Vite:** Next-generation frontend tooling for ultra-fast compilation.
- **TypeScript (Vanilla):** Strongly typed JavaScript for logic without heavy UI framework wrappers.
- **Web Audio API:** Native browser API for low-latency DSP (Digital Signal Processing).
- **CSS3:** Custom glassmorphism-styled UI components.
