from src.ecg_simulator import * 
from pathlib import Path
filename = Path(__file__).stem

max_iter = 10
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

    (t, rr), (f, psd) = tachogram(f_params, t_params, Nb=Nb, fs=fs, scaling=True)

    bounds = [
        (t_params[0] - 2* t_params[1], t_params[0] + 2* t_params[1]),
        (.1*t_params[1], 10*t_params[1]),
    ]

    res = sp.stats.fit(sp.stats.norm, rr, bounds)
    assert np.allclose(t_params, [res.params.loc, res.params.scale], rtol=1e-2)
    print(f'iter {i}/{max_iter}')

print('OK')