// Simple ECG waveform generator and interactive tool
// All code is plain JavaScript without external libraries

const canvas = document.getElementById('ecg-canvas');
const ctx = canvas.getContext('2d');
const hrSlider = document.getElementById('hr-slider');
const hrValue = document.getElementById('hr-value');
const rhythmSelect = document.getElementById('rhythm');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');
const exportBtn = document.getElementById('export');
const gridToggle = document.getElementById('grid-toggle');
const tips = document.getElementById('tips');
const learningToggle = document.getElementById('learning');

let running = false;
let showGrid = true;
let learning = false;
let time = 0;
let data = [];
let pointer = 0;

// Sample waveforms for special rhythms (simplified)
const sampleWaves = {
    normal: generateNormalWave(60),
    brady: generateNormalWave(40),
    tachy: generateNormalWave(120),
    afib: generateAfibWave(80),
    pvc: generatePvcWave(60),
    asystole: new Array(1000).fill(0)
};

function generateNormalWave(hr) {
    const fs = 300;
    const duration = 6; // seconds
    const dt = 1 / fs;
    const N = duration * fs;
    const wave = new Array(N);
    const w = 2 * Math.PI * hr / 60;
    for (let i = 0; i < N; i++) {
        const t = i * dt;
        const p = Math.sin(w * t) * 0.1;
        const qrs = Math.exp(-Math.pow((t % (60/hr)) - 0.04,2)/0.0005) * 1.0;
        const tWave = Math.sin(w * t + 0.5) * 0.05;
        wave[i] = p + qrs + tWave;
    }
    return wave;
}

function generateAfibWave(hr) {
    const base = generateNormalWave(hr);
    // add randomness
    return base.map((v,i)=> v + (Math.random()-0.5)*0.1);
}

function generatePvcWave(hr) {
    const base = generateNormalWave(hr);
    const fs = 300;
    const beat = Math.floor(fs * 60 / hr);
    for (let i=beat*2; i<beat*2+Math.floor(fs*0.2); i++) {
        if (i < base.length) base[i] += 1.5; // large spike
    }
    return base;
}

function updateData() {
    const hr = parseInt(hrSlider.value,10);
    const rhythm = rhythmSelect.value;
    if (rhythm === 'normal') {
        data = generateNormalWave(hr);
    } else if (rhythm === 'brady') {
        data = generateNormalWave(hr);
    } else if (rhythm === 'tachy') {
        data = generateNormalWave(hr);
    } else if (rhythm === 'afib') {
        data = generateAfibWave(hr);
    } else if (rhythm === 'pvc') {
        data = generatePvcWave(hr);
    } else if (rhythm === 'asystole') {
        data = new Array(1000).fill(0);
    }
    pointer = 0;
}

function drawGrid() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const gridSize = 25;
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(width,y);
        ctx.stroke();
    }
}

function drawWave() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (showGrid) drawGrid();
    ctx.beginPath();
    const offset = pointer;
    const slice = data.slice(offset, offset + canvas.width);
    for (let x=0; x<slice.length; x++) {
        const y = canvas.height/2 - slice[x]*100;
        if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (learning) showTips(slice);
}

function showTips(slice) {
    if (slice.length<1) return;
    const idx = Math.floor(slice.length/3);
    tips.textContent = 'This is the QRS complex – indicates ventricular depolarization.';
}

function loop() {
    if (running) {
        pointer = (pointer + 2) % data.length;
        drawWave();
    }
    requestAnimationFrame(loop);
}

hrSlider.addEventListener('input', () => {
    hrValue.textContent = hrSlider.value;
    updateData();
});

rhythmSelect.addEventListener('change', updateData);

startBtn.addEventListener('click', () => { running = true; });
pauseBtn.addEventListener('click', () => { running = false; });
resetBtn.addEventListener('click', () => { pointer = 0; drawWave(); });
exportBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'ecg.png';
    link.href = canvas.toDataURL();
    link.click();
});

gridToggle.addEventListener('click', () => {
    showGrid = !showGrid;
    drawWave();
});

learningToggle.addEventListener('change', () => {
    learning = learningToggle.checked;
    tips.textContent = '';
});

updateData();
loop();
