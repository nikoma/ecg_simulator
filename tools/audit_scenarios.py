import math
import random

fs = 300
duration = 10

leads = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"]

lead_config = {
    "I": {"amp": 1},
    "II": {"amp": 1.1},
    "III": {"amp": 0.9},
    "aVR": {"amp": 0.7, "invert": True},
    "aVL": {"amp": 0.7},
    "aVF": {"amp": 1},
    "V1": {"amp": 0.6, "invert": True},
    "V2": {"amp": 0.8},
    "V3": {"amp": 1},
    "V4": {"amp": 1.1},
    "V5": {"amp": 1.2},
    "V6": {"amp": 1.1},
}

case_scenarios = {
    "Normal Sinus Rhythm": {"heartRate": 60, "rhythm": "normal"},
    "Inferior STEMI": {
        "heartRate": 80,
        "rhythm": "normal",
        "leadModifications": {
            "II": {"stShift": 0.2},
            "III": {"stShift": 0.2},
            "aVF": {"stShift": 0.2},
            "aVL": {"stShift": -0.1},
        },
    },
    "Anterior STEMI": {
        "heartRate": 90,
        "rhythm": "normal",
        "leadModifications": {
            "V1": {"stShift": 0.2},
            "V2": {"stShift": 0.2},
            "V3": {"stShift": 0.2},
            "V4": {"stShift": 0.2},
        },
    },
    "Lateral STEMI": {
        "heartRate": 80,
        "rhythm": "normal",
        "leadModifications": {
            "I": {"stShift": 0.2},
            "aVL": {"stShift": 0.2},
            "V5": {"stShift": 0.2},
            "V6": {"stShift": 0.2},
        },
    },
    "First-Degree AV Block": {
        "heartRate": 70,
        "rhythm": "normal",
        "extra": {"prDelay": 0.05},
    },
    "Complete Heart Block": {
        "heartRate": 40,
        "rhythm": "brady",
        "extra": {"noP": True},
    },
    "Atrial Fibrillation": {"heartRate": 110, "rhythm": "afib"},
    "Ventricular Tachycardia": {
        "heartRate": 150,
        "rhythm": "tachy",
        "extra": {"wideQRS": True},
    },
    "Left Bundle Branch Block": {
        "heartRate": 90,
        "rhythm": "normal",
        "extra": {"wideQRS": True},
    },
    "Right Bundle Branch Block": {
        "heartRate": 90,
        "rhythm": "normal",
        "extra": {"wideQRS": True},
    },
    "Hyperkalemia ECG Pattern": {
        "heartRate": 70,
        "rhythm": "normal",
        "leadModifications": {"all": {"tHeight": 0.15}},
    },
    "Pericarditis": {
        "heartRate": 75,
        "rhythm": "normal",
        "leadModifications": {"all": {"stShift": 0.1}},
    },
}


def normal_beat(samples, with_p=True, wide_qrs=False, pr_delay=0.0):
    beat = [0.0] * samples
    qrs_start = int((0.25 + pr_delay) * samples)
    t_start = int((0.45 + pr_delay) * samples)
    qrs_dur = int((0.12 if wide_qrs else 0.07) * samples)
    t_dur = int(0.16 * samples)
    for i in range(samples):
        t = i / samples
        v = 0.0
        if with_p and 0.1 <= t < 0.2:
            phase = (t - 0.1) / 0.1
            v += 0.15 * math.sin(math.pi * phase)
        if qrs_start <= i < qrs_start + qrs_dur:
            d = (i - qrs_start) / qrs_dur
            if d < 0.3:
                v -= 0.2 * (d / 0.3)
            elif d < 0.5:
                v += (1 - d) * 1.2
            elif d < 0.7:
                v -= 0.4 * ((d - 0.5) / 0.2)
        if t_start <= i < t_start + t_dur:
            phase = (t - (0.45 + pr_delay)) / 0.16
            v += 0.1 * math.sin(math.pi * phase)
        beat[i] = v
    return beat

def generate_normal_wave(hr, opts=None, return_rr=False):
    opts = opts or {}
    beat_samples = int((60 / hr) * fs)
    beat = normal_beat(
        beat_samples,
        with_p=not opts.get("noP", False),
        wide_qrs=opts.get("wideQRS", False),
        pr_delay=opts.get("prDelay", 0.0),
    )
    beats = int((duration * hr) / 60) + 1
    waveform = beat * beats
    rr = [beat_samples] * beats
    return (waveform, rr) if return_rr else waveform

def generate_brady_wave(hr, opts=None, return_rr=False):
    return generate_normal_wave(hr, opts, return_rr)

def generate_tachy_wave(hr, opts=None, return_rr=False):
    return generate_normal_wave(hr, opts, return_rr)

def generate_afib_wave(hr, opts=None, return_rr=False):
    opts = opts or {}
    beats = int((duration * hr) / 60) + 1
    waveform = []
    rr = []
    for _ in range(beats):
        factor = 0.8 + 0.4 * random.random()
        beat_samples = int((60 / hr) * fs * factor)
        beat = normal_beat(
            beat_samples,
            with_p=False,
            wide_qrs=opts.get("wideQRS", False),
            pr_delay=opts.get("prDelay", 0.0),
        )
        waveform.extend(beat)
        rr.append(beat_samples)
    return (waveform, rr) if return_rr else waveform

def generate_pvc_wave(hr, opts=None, return_rr=False):
    opts = opts or {}
    beat_samples = int((60 / hr) * fs)
    beats = int((duration * hr) / 60) + 1
    pvc_index = 3 + int(random.random() * 3)
    waveform = []
    rr = []
    for i in range(beats):
        if i == pvc_index:
            beat = normal_beat(
                beat_samples,
                with_p=False,
                wide_qrs=True,
                pr_delay=opts.get("prDelay", 0.0),
            )
        else:
            beat = normal_beat(
                beat_samples,
                with_p=not opts.get("noP", False),
                wide_qrs=opts.get("wideQRS", False),
                pr_delay=opts.get("prDelay", 0.0),
            )
        waveform.extend(beat)
        rr.append(beat_samples)
    return (waveform, rr) if return_rr else waveform

def generate_asystole_wave(hr=None, opts=None, return_rr=False):
    waveform = [0.0] * int(duration * fs)
    rr = []
    return (waveform, rr) if return_rr else waveform

rhythm_generators = {
    "normal": generate_normal_wave,
    "brady": generate_brady_wave,
    "tachy": generate_tachy_wave,
    "afib": generate_afib_wave,
    "pvc": generate_pvc_wave,
    "asystole": generate_asystole_wave,
}

def apply_lead(base, cfg):
    amp = cfg.get("amp", 1)
    inv = -1 if cfg.get("invert") else 1
    return [v * amp * inv for v in base]

def apply_lead_mods(arr, mod, hr):
    if not mod:
        return arr
    beat_samples = int((60 / hr) * fs)
    out = list(arr)
    for i in range(len(out)):
        pos = i % beat_samples
        if "stShift" in mod and 0.32 * beat_samples <= pos < 0.42 * beat_samples:
            out[i] += mod["stShift"]
        if "tHeight" in mod and 0.45 * beat_samples <= pos < 0.61 * beat_samples:
            out[i] += mod["tHeight"]
    return out

def analyze_case(name, cfg):
    hr = cfg.get("heartRate", 60)
    rhythm = cfg.get("rhythm", "normal")
    extra = cfg.get("extra", {})
    lead_mods = cfg.get("leadModifications", {})

    waveform, rr_list = rhythm_generators[rhythm](hr, extra, return_rr=True)
    lead_data = {ld: apply_lead(waveform, lead_config.get(ld, {})) for ld in leads}
    for ld, mod in lead_mods.items():
        if ld == "all":
            for l in leads:
                lead_data[l] = apply_lead_mods(lead_data[l], mod, hr)
        elif ld in lead_data:
            lead_data[ld] = apply_lead_mods(lead_data[ld], mod, hr)

    issues = []
    affected = set()

    nominal_bs = int((60 / hr) * fs)
    if rhythm == "afib" and len(rr_list) > 1:
        if max(rr_list) - min(rr_list) < 0.05 * nominal_bs:
            issues.append("R-R intervals appear regular")

    for ld, data in lead_data.items():
        beat = data[:nominal_bs]
        p_section = beat[int(0.1 * nominal_bs) : int(0.2 * nominal_bs)]
        p_range = (max(p_section) - min(p_section)) if p_section else 0.0
        p_present = p_range > 0.03
        if rhythm == "afib" or extra.get("noP"):
            if p_present:
                issues.append("Visible P waves found")
                affected.add(ld)
        else:
            if not p_present:
                issues.append("P waves absent")
                affected.add(ld)
        qrs_end = int((0.25 + extra.get("prDelay", 0.0)) * nominal_bs) + int(
            (0.12 if extra.get("wideQRS") else 0.07) * nominal_bs
        )
        qrs_section = beat[int((0.25 + extra.get("prDelay", 0.0)) * nominal_bs) : qrs_end]
        active = sum(1 for v in qrs_section if abs(v) > 0.05)
        width = active / nominal_bs
        if extra.get("wideQRS"):
            if width < 0.12 - 0.02:
                issues.append("QRS duration too narrow")
                affected.add(ld)
        else:
            if width > 0.09:
                issues.append("QRS duration appears wide")
                affected.add(ld)
        if ld in lead_mods and "stShift" in lead_mods[ld]:
            st_section = beat[int(0.32 * nominal_bs) : int(0.42 * nominal_bs)]
            shift = sum(st_section) / len(st_section) if st_section else 0.0
            if abs(shift - lead_mods[ld]["stShift"]) > 0.05:
                issues.append("Incorrect ST shift amplitude")
                affected.add(ld)

    return issues, sorted(affected)

def main():
    passed = []
    problems = []
    details = []
    for name, cfg in case_scenarios.items():
        issues, affected = analyze_case(name, cfg)
        if issues:
            problems.append(name)
            details.append({"scenario": name, "issue": "; ".join(sorted(set(issues))), "leadsAffected": affected})
        else:
            passed.append(name)

    print("Passed Scenarios:")
    for p in passed:
        print(" -", p)
    print("Scenarios needing fix:")
    for p in problems:
        print(" -", p)
    print("\nDetails:")
    for d in details:
        print(d)

if __name__ == "__main__":
    main()
