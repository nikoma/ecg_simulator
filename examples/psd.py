from src.ecg_simulator import * 
from pathlib import Path
from geometric_plotter import Plotter 
filename = Path(__file__).stem

fs, Nb = 1024, 200
f_params = .1, .01, .25, .01, .5
t_params = 1., .05
(t, rr), (f, psd) = tachogram(f_params, t_params, Nb=Nb, fs=fs, scaling=False)


p = Plotter(_2d=True, figsize = (5,5.))
p.axs.plot(f, psd, '-k')
p.axs.set_xlim((f_params[0]-8*f_params[1], f_params[2]+8*f_params[3]))
p.axs.set_ylabel('PSD')
p.axs.set_xlabel('Frequency [Hz]')
p.save(folder='figs/', name=filename)

Plotter.show()