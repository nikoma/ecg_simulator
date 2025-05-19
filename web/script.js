// Enhanced ECG Simulator -- vanilla JavaScript

const canvas = document.getElementById('ecg-canvas');
const ctx = canvas.getContext('2d');
const hrSlider = document.getElementById('hr-slider');
const hrValue = document.getElementById('hr-value');
const rhythmSelect = document.getElementById('rhythm');
const colorSelect = document.getElementById('color');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');
const exportBtn = document.getElementById('export');
const saveBtn = document.getElementById('save');
const gridToggle = document.getElementById('grid-toggle');
const tips = document.getElementById('tips');
const info = document.getElementById('info');
const learningToggle = document.getElementById('learning');
const quizToggle = document.getElementById('quiz-toggle');
const quizDiv = document.getElementById('quiz');
const overlay = document.getElementById('overlay');
const rhythmLabel = document.getElementById('rhythm-label');

let running = false;
let showGrid = true;
let learning = false;
let quizMode = false;
let pointer = 0;
let data = [];
let currentRhythm = 'normal';
let quizResult = null;

const fs = 300; // sample rate
const duration = 10; // seconds of data to generate

// -------------------- Waveform generation --------------------
function normalBeat(samples, withP=true, wideQRS=false) {
    const beat = new Array(samples).fill(0);
    for (let i = 0; i < samples; i++) {
        const t = i / samples; // 0-1
        let v = 0;
        if (withP && t >= 0.1 && t < 0.2) {
            const phase = (t - 0.1) / 0.1;
            v += 0.15 * Math.sin(Math.PI * phase);
        }
        if (t >= 0.25 && t < 0.25 + (wideQRS ? 0.12 : 0.07)) {
            const d = (t - 0.25) / (wideQRS ? 0.12 : 0.07);
            if (d < 0.3) v -= 0.2 * (d / 0.3);
            else if (d < 0.5) v += (1 - d) * 1.2;
            else if (d < 0.7) v -= 0.4 * ((d - 0.5) / 0.2);
        }
        if (t >= 0.45 && t < 0.61) {
            const phase = (t - 0.45) / 0.16;
            v += 0.1 * Math.sin(Math.PI * phase);
        }
        beat[i] = v;
    }
    return beat;
}

function generateNormalWave(hr) {
    const beatSamples = Math.floor((60 / hr) * fs);
    const beat = normalBeat(beatSamples);
    const beats = Math.ceil((duration * hr) / 60) + 1;
    const out = [];
    for (let i = 0; i < beats; i++) out.push(...beat);
    return out;
}

function generateBradyWave(hr) { return generateNormalWave(hr); }
function generateTachyWave(hr) { return generateNormalWave(hr); }

function generateAfibWave(hr) {
    const beats = Math.ceil((duration * hr) / 60) + 1;
    const out = [];
    for (let i = 0; i < beats; i++) {
        const beatSamples = Math.floor((60 / hr) * fs * (0.8 + Math.random() * 0.4));
        const beat = normalBeat(beatSamples, false);
        out.push(...beat);
    }
    return out;
}

function generatePvcWave(hr) {
    const beatSamples = Math.floor((60 / hr) * fs);
    const beats = Math.ceil((duration * hr) / 60) + 1;
    const out = [];
    const pvcIndex = 3 + Math.floor(Math.random() * 3); // after 3-5 beats
    for (let i = 0; i < beats; i++) {
        if (i === pvcIndex) out.push(...normalBeat(beatSamples, false, true));
        else out.push(...normalBeat(beatSamples));
    }
    return out;
}

function generateAsystoleWave() {
    return new Array(duration * fs).fill(0);
}

const rhythmGenerators = {
    normal: generateNormalWave,
    brady: generateBradyWave,
    tachy: generateTachyWave,
    afib: generateAfibWave,
    pvc: generatePvcWave,
    asystole: generateAsystoleWave
};

const rhythmInfo = {
    normal: 'Normal Sinus Rhythm: regular P-QRS-T pattern around 60-100 bpm.',
    brady: 'Bradycardia: same pattern but slower (40-60 bpm).',
    tachy: 'Tachycardia: same pattern faster (100-180 bpm).',
    afib: 'Atrial Fibrillation: irregular rhythm with absent P waves.',
    pvc: 'PVC: occasional wide bizarre QRS after normal beats.',
    asystole: 'Asystole: flatline with no electrical activity.'
};

// -------------------- Drawing helpers --------------------
function drawGrid() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const grid = 25;
    for (let x = 0; x < width; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawLabels(pos) {
    overlay.innerHTML = '';
    if (!learning) return;
    const beatSamples = Math.floor((60 / parseInt(hrSlider.value,10)) * fs);
    const phase = pos % beatSamples;
    const frac = phase / beatSamples;
    const width = canvas.width;
    function place(text,x){
        const span=document.createElement('span');
        span.textContent=text;
        span.style.left=x+'px';
        span.style.top='20px';
        span.title=text;
        overlay.appendChild(span);
    }
    if(frac>=0.1&&frac<0.2) place('P wave',width*0.3);
    else if(frac>=0.25&&frac<0.32) place('QRS complex',width*0.5);
    else if(frac>=0.45&&frac<0.61) place('T wave',width*0.7);
}

function drawWave() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (showGrid) drawGrid();
    const slice = data.slice(pointer, pointer + canvas.width);
    ctx.beginPath();
    slice.forEach((v,x)=>{
        const y = canvas.height/2 - v*100;
        if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = colorSelect.value === 'green' ? '#00aa00' : '#ff0000';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLabels(pointer);
}

function updateData() {
    const hr = parseInt(hrSlider.value,10);
    currentRhythm = rhythmSelect.value;
    const gen = rhythmGenerators[currentRhythm];
    data = gen(hr);
    pointer = 0;
    info.textContent = rhythmInfo[currentRhythm];
}

// -------------------- Quiz Mode --------------------
function startQuiz() {
    quizDiv.innerHTML = '';
    const rhythms = Object.keys(rhythmGenerators);
    currentRhythm = rhythms[Math.floor(Math.random()*rhythms.length)];
    rhythmSelect.value = currentRhythm;
    updateData();
    rhythmLabel.style.display = 'none';
    rhythmSelect.style.display = 'none';
    setTimeout(showQuizOptions,10000);
}

function showQuizOptions(){
    running = false;
    const all = Object.keys(rhythmGenerators);
    const options = [currentRhythm];
    while(options.length<4){
        const r = all[Math.floor(Math.random()*all.length)];
        if(!options.includes(r)) options.push(r);
    }
    options.sort(()=>Math.random()-0.5);
    const form = document.createElement('form');
    options.forEach(opt=>{
        const label=document.createElement('label');
        const radio=document.createElement('input');
        radio.type='radio';
        radio.name='quiz';
        radio.value=opt;
        label.appendChild(radio);
        label.appendChild(document.createTextNode(' '+opt));
        form.appendChild(label);
        form.appendChild(document.createElement('br'));
    });
    const submit=document.createElement('button');
    submit.textContent='Submit';
    form.appendChild(submit);
    form.addEventListener('submit',e=>{
        e.preventDefault();
        const choice=form.querySelector('input[name="quiz"]:checked');
        if(!choice) return;
        const correct=choice.value===currentRhythm;
        quizResult={answer:choice.value,correct};
        quizDiv.innerHTML = correct ? '✅ Correct!' : '❌ Incorrect. Correct answer: '+currentRhythm;
        quizDiv.appendChild(document.createElement('br'));
        const btn=document.createElement('button');
        btn.textContent='Try another';
        btn.onclick=()=>{ quizDiv.innerHTML=''; startQuiz(); running=true; };
        quizDiv.appendChild(btn);
    });
    quizDiv.appendChild(form);
}

// -------------------- Loop --------------------
function loop(){
    if(running){
        pointer = (pointer+2) % data.length;
        drawWave();
    }
    requestAnimationFrame(loop);
}

// -------------------- Controls --------------------
hrSlider.addEventListener('input',()=>{ hrValue.textContent=hrSlider.value; updateData(); });
rhythmSelect.addEventListener('change',updateData);
colorSelect.addEventListener('change',drawWave);
startBtn.addEventListener('click',()=>{running=true;});
pauseBtn.addEventListener('click',()=>{running=false;});
resetBtn.addEventListener('click',()=>{pointer=0; drawWave();});
exportBtn.addEventListener('click',()=>{
    const link=document.createElement('a');
    link.download='ecg.png';
    link.href=canvas.toDataURL();
    link.click();
});
saveBtn.addEventListener('click',()=>{
    const dataObj={
        timestamp:new Date().toISOString(),
        rhythm:currentRhythm,
        heartRate:hrSlider.value,
        quizResponse:quizResult
    };
    const blob=new Blob([JSON.stringify(dataObj,null,2)],{type:'application/json'});
    const link=document.createElement('a');
    link.download='session.json';
    link.href=URL.createObjectURL(blob);
    link.click();
});

gridToggle.addEventListener('click',()=>{ showGrid=!showGrid; drawWave(); });
learningToggle.addEventListener('change',()=>{ learning=learningToggle.checked; drawWave(); });
quizToggle.addEventListener('change',()=>{
    quizMode=quizToggle.checked;
    quizDiv.innerHTML='';
    if(quizMode){
        startQuiz();
    } else {
        rhythmLabel.style.display='inline';
        rhythmSelect.style.display='inline';
        quizResult=null;
    }
});

updateData();
loop();
