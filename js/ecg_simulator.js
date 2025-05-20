// Simple ECG simulator for browser
// This is a simplified JavaScript implementation inspired by the Python version
// It generates a synthetic ECG using a sum of Gaussian functions for each wave.
// Wave definitions are loaded from an external JSON file so that patterns can be
// edited without touching this script.

import wavePatterns from './wave_patterns.json' assert { type: 'json' };

function simulateECG({
    fs = 256,            // sampling frequency
    hr = 60,             // mean heart rate (bpm)
    duration = 10,       // total time in seconds
    patterns = wavePatterns // optional custom wave patterns
} = {}) {
    const dt = 1 / fs;
    const N = Math.floor(duration * fs);
    // Wave parameters loaded from JSON
    const { Ti, ai, bi } = patterns;

    let theta = 0;
    let z = 0;
    const ecg = new Array(N);

    for (let i = 0; i < N; i++) {
        const w = 2 * Math.PI * hr / 60;
        let dzdt = 0;
        for (let j = 0; j < Ti.length; j++) {
            let d = (theta - Ti[j] + Math.PI) % (2 * Math.PI) - Math.PI;
            dzdt += ai[j] * Math.exp(-0.5 * Math.pow(d / bi[j], 2)) * (-d / (bi[j] * bi[j]));
        }
        dzdt *= w;
        z += dzdt * dt;
        theta += w * dt;
        ecg[i] = z;
    }

    return ecg;
}

function drawECG(canvasId, data, fs) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const scaleY = canvas.height / (max - min);
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = i * scaleX;
        const y = canvas.height - (data[i] - min) * scaleY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#000';
    ctx.stroke();
}

export { simulateECG, drawECG };
