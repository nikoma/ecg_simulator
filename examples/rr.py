from src.ecg_simulator import * 
from pathlib import Path
from geometric_plotter import Plotter 
filename = Path(__file__).stem

fs, Nb = 256, 200
f_params = .1, .01, .25, .01, .5
t_params = 1., .05
(t, rr), (f, psd) = tachogram(f_params, t_params, Nb=Nb, fs=fs, scaling=True)

bounds = [
    (t_params[0] - 2* t_params[1], t_params[0] + 2* t_params[1]),
    (.1*t_params[1], 10*t_params[1]),
]
t_params_est = sp.stats.fit(sp.stats.norm, rr, bounds).params

p = Plotter(_2d=True,  width_ratios=[4,1], sharey=True, nrows=1, ncols=2, figsize = (12.,5.))
p.axs[1].hist(rr, density=True, color='gray', orientation='horizontal')
p.axs[1].plot(sp.stats.norm.pdf(t, *t_params_est), t, '-k')
p.axs[1].set_ylim((t_params[0]-6*t_params[1], t_params[0]+6*t_params[1]))
p.axs[1].axis('off')


p.axs[0].plot(t, rr, '-k')
p.axs[0].step(t[::fs], rr[::fs], '--k', where='post')
p.axs[0].set_ylabel('RR [s]')
p.axs[0].set_xlabel('time [s]')

axins = p.axs[0].inset_axes([0.6, 0.7, 0.25, 0.4])
axins.set_xticks([])
axins.set_yticks([])
axins.set_xlim((100, 110))
axins.plot(t, rr, '-k')
axins.step(t[::fs], rr[::fs], '--k', where='post')
p.axs[0].indicate_inset_zoom(axins, edgecolor="black")

p.save(folder='figs/', name=filename)

Plotter.show()