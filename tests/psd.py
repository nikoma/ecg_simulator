from src.ecg_simulator import * 
from pathlib import Path
filename = Path(__file__).stem

max_iter = 25
for i in range(max_iter):
    fs, Nb = np.random.uniform(256, 1024), int(np.random.uniform(100, 1000))
    f_params = [
        np.random.uniform(.1, .25),
        np.random.uniform(.01, .08),
        np.random.uniform(.3, 1.),
        np.random.uniform(.05, .08),
        np.random.uniform(.1, .9),
    ]
    t_params = [
        np.random.uniform(.6, 1.5),
        np.random.uniform(.01, .3),
    ]

    (t, rr), (f, psd) = tachogram(f_params, t_params, Nb=Nb, fs=fs, scaling=False)
    _f, _psd = sp.signal.periodogram(rr, fs=fs, scaling='density', return_onesided=True, detrend=False)
    assert np.allclose(f, _f, rtol=1e-4)
    assert np.allclose(psd[1:], _psd[1:], rtol=1e-4)
    print(f'iter {i}/{max_iter}')

print('OK')