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
const caseSelect = document.getElementById('case-select');
const caseInfo = document.getElementById('case-info');


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
let currentCaseOptions = null;
let animationId = null;

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

const caseScenarios = {
    "Normal Sinus Rhythm": {
        heartRate: 60,
        rhythm: "normal",
        leadModifications: {},
        notes: "Normal sinus rhythm."
    },
    "Inferior STEMI": {
        heartRate: 80,
        rhythm: "normal",
        leadModifications: {
            II:{stShift:0.2},
            III:{stShift:0.2},
            aVF:{stShift:0.2},
            aVL:{stShift:-0.1}
        },
        notes: "ST elevation in II, III, aVF; reciprocal changes in aVL."
    },
    "Anterior STEMI": {
        heartRate: 90,
        rhythm: "normal",
        leadModifications: {V1:{stShift:0.2},V2:{stShift:0.2},V3:{stShift:0.2},V4:{stShift:0.2}},
        notes: "ST elevation in V1-V4 suggests LAD occlusion."
    },
    "Lateral STEMI": {
        heartRate: 80,
        rhythm: "normal",
        leadModifications: {I:{stShift:0.2},aVL:{stShift:0.2},V5:{stShift:0.2},V6:{stShift:0.2}},
        notes: "ST elevation in I, aVL, V5, V6."
    },
    "First-Degree AV Block": {
        heartRate: 70,
        rhythm: "normal",
        extra:{prDelay:0.05},
        notes: "PR interval >200ms on all leads."
    },
    "Complete Heart Block": {
        heartRate: 40,
        rhythm: "avdissociation",
        extra:{pRate:80},
        notes: "AV dissociation with slow wide-complex escape rhythm."
    },
    "Atrial Fibrillation": {
        heartRate: 110,
        rhythm: "afib",
        notes: "Irregularly irregular rhythm with absent P waves."
    },
    "Ventricular Tachycardia": {
        heartRate: 150,
        rhythm: "vtach",
        notes: "Fast monomorphic wide-complex rhythm."
    },
    "Left Bundle Branch Block": {
        heartRate: 90,
        rhythm: "normal",
        extra:{wideQRS:true},
        leadModifications:{
            I:{qrsMorph:'broad'},
            V5:{qrsMorph:'broad'},
            V6:{qrsMorph:'broad'}
        },
        notes: "Wide QRS pattern best in I, V6."
    },
    "Right Bundle Branch Block": {
        heartRate: 90,
        rhythm: "normal",
        extra:{wideQRS:true},
        leadModifications:{
            V1:{qrsMorph:'rsR'},
            V2:{qrsMorph:'rsR'}
        },
        notes: "Wide QRS with rSR' in V1-V3."
    },
    "Hyperkalemia ECG Pattern": {
        heartRate: 70,
        rhythm: "normal",
        extra:{prDelay:0.04, wideQRS:true, withP:false},
        leadModifications:{all:{tHeight:0.15}},
        notes: "Tall peaked T waves due to hyperkalemia."
    },
    "Pericarditis": {
        heartRate: 75,
        rhythm: "normal",
        leadModifications:{all:{stShift:0.1}},
        notes: "Diffuse concave ST elevation."
    }
};

// -------------------- Waveform generation --------------------
function normalBeat(samples, opts={}) {
    const withP = opts.withP !== false;
    const wideQRS = !!opts.wideQRS;
    const prDelay = opts.prDelay || 0;
    const beat = new Array(samples).fill(0);
    const qrsStart = 0.25 + prDelay;
    const tStart = 0.45 + prDelay;
    for (let i = 0; i < samples; i++) {
        const t = i / samples; // 0-1
        let v = 0;
        if (withP && t >= 0.1 && t < 0.2) {
            const phase = (t - 0.1) / 0.1;
            v += 0.15 * Math.sin(Math.PI * phase);
        }
        if (t >= qrsStart && t < qrsStart + (wideQRS ? 0.12 : 0.07)) {
            const d = (t - qrsStart) / (wideQRS ? 0.12 : 0.07);
            if (d < 0.3) v -= 0.2 * (d / 0.3);
            else if (d < 0.5) v += (1 - d) * 1.2;
            else if (d < 0.7) v -= 0.4 * ((d - 0.5) / 0.2);
        }
        if (t >= tStart && t < tStart + 0.16) {
            const phase = (t - tStart) / 0.16;
            v += 0.1 * Math.sin(Math.PI * phase);
        }
        beat[i] = v;
    }
    return beat;
}

function pOnlyBeat(samples){
    const beat=new Array(samples).fill(0);
    for(let i=0;i<samples;i++){
        const t=i/samples;
        if(t>=0.1 && t<0.2){
            const phase=(t-0.1)/0.1;
            beat[i]+=0.15*Math.sin(Math.PI*phase);
        }
    }
    return beat;
}

function generateNormalWave(hr, opts={}) {
    const beatSamples = Math.floor((60 / hr) * fs);
    const beat = normalBeat(beatSamples, opts);
    const beats = Math.ceil((duration * hr) / 60) + 1;
    const out = [];
    for (let i = 0; i < beats; i++) out.push(...beat);
    return out;
}

function generateBradyWave(hr, opts={}) { return generateNormalWave(hr, opts); }
function generateTachyWave(hr, opts={}) { return generateNormalWave(hr, opts); }

function generateAfibWave(hr, opts={}) {
    const beats = Math.ceil((duration * hr) / 60) + 1;
    const out = [];
    for (let i = 0; i < beats; i++) {
        const beatSamples = Math.floor((60 / hr) * fs * (0.6 + Math.random() * 0.8));
        const beat = normalBeat(beatSamples, Object.assign({}, opts, {withP:false}));
        for(let j=0;j<beat.length;j++) beat[j]+= (Math.random()-0.5)*0.02;
        out.push(...beat);
    }
    return out;
}

function generatePvcWave(hr, opts={}) {
    const beatSamples = Math.floor((60 / hr) * fs);
    const beats = Math.ceil((duration * hr) / 60) + 1;
    const out = [];
    const pvcIndex = 3 + Math.floor(Math.random() * 3); // after 3-5 beats
    for (let i = 0; i < beats; i++) {
        if (i === pvcIndex) out.push(...normalBeat(beatSamples, Object.assign({}, opts, {withP:false, wideQRS:true})));
        else out.push(...normalBeat(beatSamples, opts));
    }
    return out;
}

function generateVTachWave(hr, opts={}) {
    const options = Object.assign({withP:false, wideQRS:true}, opts);
    return generateNormalWave(hr, options);
}

function generateAVDissociationWave(hr, opts={}) {
    const pRate = opts.pRate || 80;
    const vent = generateNormalWave(hr, Object.assign({}, opts, {withP:false, wideQRS:true}));
    const pSamples = Math.floor((60/pRate)*fs);
    const pBeat = pOnlyBeat(pSamples);
    const pBeats = Math.ceil((duration * pRate)/60)+1;
    const atrial=[];
    for(let i=0;i<pBeats;i++) atrial.push(...pBeat);
    const len=Math.max(vent.length, atrial.length);
    const out=new Array(len).fill(0);
    for(let i=0;i<len;i++){
        if(i<vent.length) out[i]+=vent[i];
        if(i<atrial.length) out[i]+=atrial[i];
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
    vtach: generateVTachWave,
    avdissociation: generateAVDissociationWave,
    asystole: generateAsystoleWave
};

const rhythmInfo = {
    normal: 'Normal Sinus Rhythm: regular P-QRS-T pattern around 60-100 bpm.',
    brady: 'Bradycardia: same pattern but slower (40-60 bpm).',
    tachy: 'Tachycardia: same pattern faster (100-180 bpm).',
    afib: 'Atrial Fibrillation: irregular rhythm with absent P waves.',
    pvc: 'PVC: occasional wide bizarre QRS after normal beats.',
    vtach: 'Ventricular Tachycardia: no P waves and wide regular QRS.',
    avdissociation: 'Complete Heart Block with independent atrial and ventricular rates.',
    asystole: 'Asystole: flatline with no electrical activity.'
};

function applyLead(base, cfg){
    const amp = cfg.amp || 1;
    const inv = cfg.invert ? -1 : 1;
    return base.map(v => v * amp * inv);
}

function applyLeadMods(arr, mod, hr){
    if(!mod) return arr;
    const beatSamples = Math.floor((60/hr)*fs);
    const out = arr.slice();
    const qrsStart = Math.floor(0.25*beatSamples);
    const qrsWidth = Math.floor(0.12*beatSamples);
    for(let i=0;i<out.length;i++){
        const pos = i % beatSamples;
        if(mod.stShift && pos>=0.32*beatSamples && pos<0.42*beatSamples)
            out[i]+=mod.stShift;
        if(mod.tHeight && pos>=0.45*beatSamples && pos<0.61*beatSamples)
            out[i]+=mod.tHeight;
        if(mod.qrsMorph && pos>=qrsStart && pos<qrsStart+qrsWidth){
            const d=(pos-qrsStart)/qrsWidth;
            if(mod.qrsMorph==='rsR' && d>0.6 && d<0.8)
                out[i]+=0.3*(1-Math.abs((d-0.7)/0.1));
            if(mod.qrsMorph==='broad')
                out[i]=0.5*out[i]+0.5*Math.sin(Math.PI*d);
        }
    }
    return out;
}

function loadCase(name){
    const cfg = caseScenarios[name];
    if(!cfg) return;
    caseSelect.value = name;
    if(cfg.heartRate){
        hrSlider.value = cfg.heartRate;
        hrValue.textContent = cfg.heartRate;
    }
    if(cfg.rhythm){
        rhythmSelect.value = cfg.rhythm;
    }
    currentCaseOptions = cfg.extra || null;
    updateData(currentCaseOptions);
    const hr = parseInt(hrSlider.value,10);
    if(cfg.leadModifications){
        Object.keys(cfg.leadModifications).forEach(ld=>{
            const mod = cfg.leadModifications[ld];
            if(ld==='all'){
                leads.forEach(l=>{ leadData[l] = applyLeadMods(leadData[l], mod, hr); });
            } else if(leadData[ld]){
                leadData[ld] = applyLeadMods(leadData[ld], mod, hr);
            }
        });
        data = leadData[leadSelect.value];
    }
    caseInfo.textContent = cfg.notes || '';
    running = false;
    if(animationId) cancelAnimationFrame(animationId);
    drawWave();
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

function updateData(opts={}) {
    const hr = parseInt(hrSlider.value,10);
    currentRhythm = rhythmSelect.value;
    const gen = rhythmGenerators[currentRhythm];
    baseData = gen(hr, opts);
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
function animate(){
    if(running){
        pointer = (pointer+2) % baseData.length;
        drawWave();
    }
    animationId = requestAnimationFrame(animate);
}

function resetAndStartECG(){
    if(animationId) cancelAnimationFrame(animationId);
    pointer = 0;
    running = true;
    animate();
}

// -------------------- Controls --------------------
hrSlider.addEventListener('input',()=>{ hrValue.textContent=hrSlider.value; updateData(currentCaseOptions); });
rhythmSelect.addEventListener('change',()=>{ currentCaseOptions=null; updateData(); });
colorSelect.addEventListener('change',drawWave);
startBtn.addEventListener('click',resetAndStartECG);
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
caseSelect.addEventListener('change',()=>{ loadCase(caseSelect.value); });

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

loadCase('Normal Sinus Rhythm');
resetAndStartECG();
