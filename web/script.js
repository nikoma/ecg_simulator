// Enhanced ECG Simulator -- vanilla JavaScript

const canvas = document.getElementById('ecg-canvas');
const ctx = canvas.getContext('2d');
const viewMode = document.getElementById('view-mode');
const leadSelect = document.getElementById('lead-select');
const gridView = document.getElementById('grid-view');
const singleView = document.getElementById('single-view');
const exportDataBtn = document.getElementById('export-data');
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
const darkToggle = document.getElementById('dark-toggle');


let running = false;
let showGrid = true;
let learning = false;
let quizMode = false;
let pointer = 0;
let data = [];
let currentRhythm = 'normal';
let quizResult = null;
const leads = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"];
let baseData = [];
let leadData = {};

// build grid canvases after DOM is ready
leads.forEach(ld=>{
    const wrapper=document.createElement('div');
    wrapper.className='lead';
    const label=document.createElement('span');
    label.className='lead-label';
    label.textContent=ld;
    const c=document.createElement('canvas');
    c.width=250; c.height=150; c.className='lead-canvas';
    c.dataset.lead=ld;
    wrapper.appendChild(label);
    wrapper.appendChild(c);
    gridView.appendChild(wrapper);
});

const fs = 300; // sample rate
const duration = 10; // seconds of data to generate

const leadConfig = {
    I:{amp:1},
    II:{amp:1.1},
    III:{amp:0.9},
    aVR:{amp:0.7,invert:true},
    aVL:{amp:0.7},
    aVF:{amp:1},
    V1:{amp:0.6,invert:true},
    V2:{amp:0.8},
    V3:{amp:1},
    V4:{amp:1.1},
    V5:{amp:1.2},
    V6:{amp:1.1}
};

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

function applyLead(base, cfg){
    const amp = cfg.amp || 1;
    const inv = cfg.invert ? -1 : 1;
    return base.map(v => v * amp * inv);
}

// -------------------- Drawing helpers --------------------
function drawGrid(gctx, width, height) {
    gctx.strokeStyle = '#e0e0e0';
    gctx.lineWidth = 1;
    const grid = 25;
    for (let x = 0; x < width; x += grid) {
        gctx.beginPath();
        gctx.moveTo(x, 0);
        gctx.lineTo(x, height);
        gctx.stroke();
    }
    for (let y = 0; y < height; y += grid) {
        gctx.beginPath();
        gctx.moveTo(0, y);
        gctx.lineTo(width, y);
        gctx.stroke();
    }
}

function drawLabels() {
    overlay.innerHTML = '';
    if (!learning || running) return;
    const width = canvas.width;
    const labels = [
        { text: 'P', x: width * 0.25 },
        { text: 'QRS', x: width * 0.5 },
        { text: 'T', x: width * 0.75 }
    ];
    labels.forEach(l => {
        const span = document.createElement('span');
        span.textContent = l.text;
        span.className = 'ecg-label';
        span.style.left = l.x + 'px';
        span.style.top = '20px';
        overlay.appendChild(span);
        requestAnimationFrame(() => span.classList.add('show'));
    });
}

function drawWave() {
    if(viewMode.value === 'single'){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        if (showGrid) drawGrid(ctx, canvas.width, canvas.height);
        const slice = data.slice(pointer, pointer + canvas.width);
        ctx.beginPath();
        slice.forEach((v,x)=>{
            const y = canvas.height/2 - v*100;
            if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        const colorMap = {red:'#ff0000', green:'#00aa00', blue:'#0000cc'};
        ctx.strokeStyle = colorMap[colorSelect.value] || '#ff0000';
        ctx.lineWidth = 2;
        ctx.stroke();
        drawLabels();
    } else {
        document.querySelectorAll('.lead-canvas').forEach(cv=>{
            const cctx = cv.getContext('2d');
            cctx.clearRect(0,0,cv.width,cv.height);
            if(showGrid) drawGrid(cctx, cv.width, cv.height);
            const ld = leadData[cv.dataset.lead];
            const slice = ld.slice(pointer, pointer + cv.width);
            cctx.beginPath();
            slice.forEach((v,x)=>{
                const y = cv.height/2 - v*80;
                if(x===0) cctx.moveTo(x,y); else cctx.lineTo(x,y);
            });
            const colorMap = {red:'#ff0000', green:'#00aa00', blue:'#0000cc'};
            cctx.strokeStyle = colorMap[colorSelect.value] || '#ff0000';
            cctx.lineWidth = 2;
            cctx.stroke();
        });
    }
}

function updateData() {
    const hr = parseInt(hrSlider.value,10);
    currentRhythm = rhythmSelect.value;
    const gen = rhythmGenerators[currentRhythm];
    baseData = gen(hr);
    leadData = {};
    leads.forEach(l=>{ leadData[l] = applyLead(baseData, leadConfig[l]||{}); });
    data = leadData[leadSelect.value];
    pointer = 0;
    info.textContent = rhythmInfo[currentRhythm];
    document.getElementById('lead-name').textContent='Lead '+leadSelect.value;
    drawWave();
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
        quizDiv.innerHTML='';
        const result=document.createElement('div');
        result.className=correct?'feedback-correct':'feedback-wrong';
        result.textContent=correct?'✅ Correct!':'❌ Incorrect! Correct: '+currentRhythm;
        quizDiv.appendChild(result);
        const btn=document.createElement('button');
        btn.textContent='Try another';
        btn.style.marginLeft='10px';
        btn.onclick=()=>{ quizDiv.innerHTML=''; startQuiz(); running=true; };
        quizDiv.appendChild(document.createElement('br'));
        quizDiv.appendChild(btn);
    });
    quizDiv.appendChild(form);
}

// -------------------- Loop --------------------
function loop(){
    if(running){
        pointer = (pointer+2) % baseData.length;
        drawWave();
    }
    requestAnimationFrame(loop);
}

// -------------------- Controls --------------------
hrSlider.addEventListener('input',()=>{ hrValue.textContent=hrSlider.value; updateData(); });
rhythmSelect.addEventListener('change',updateData);
colorSelect.addEventListener('change',drawWave);
startBtn.addEventListener('click',()=>{running=true; drawWave();});
pauseBtn.addEventListener('click',()=>{running=false; drawWave();});
resetBtn.addEventListener('click',()=>{pointer=0; drawWave();});
exportBtn.addEventListener('click',()=>{
    if(viewMode.value==='single'){
        const link=document.createElement('a');
        link.download=`lead_${leadSelect.value}.png`;
        link.href=canvas.toDataURL();
        link.click();
    } else {
        const off=document.createElement('canvas');
        const w=250, h=150;
        off.width=3*w; off.height=4*h;
        const octx=off.getContext('2d');
        document.querySelectorAll('.lead-canvas').forEach((cv,i)=>{
            const x=(i%3)*w, y=Math.floor(i/3)*h;
            octx.drawImage(cv,x,y);
        });
        const link=document.createElement('a');
        link.download='ecg_grid.png';
        link.href=off.toDataURL();
        link.click();
    }
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

exportDataBtn.addEventListener('click',()=>{
    const payload={
        rhythm:currentRhythm,
        heartRate:hrSlider.value,
        leads:leadData
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const link=document.createElement('a');
    link.download='waveform.json';
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

darkToggle.addEventListener('change',()=>{
    document.body.classList.toggle('dark', darkToggle.checked);
});

viewMode.addEventListener('change',()=>{
    if(viewMode.value==='single'){
        gridView.classList.add('hidden');
        singleView.classList.remove('hidden');
    }else{
        singleView.classList.add('hidden');
        gridView.classList.remove('hidden');
    }
    drawWave();
});

leadSelect.addEventListener('change',()=>{
    data = leadData[leadSelect.value];
    document.getElementById('lead-name').textContent='Lead '+leadSelect.value;
    drawWave();
});

updateData();
loop();
