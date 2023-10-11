from src.ecg_simulator import * 
from pathlib import Path
from geometric_plotter import Plotter 
filename = Path(__file__).stem

fe = BeatFeatures(
        P=FunFeatures(a=.2, μ=np.pi*2/3., σ=.25),
        Q=FunFeatures(a=-.2, μ=np.pi*11/12., σ=.1),
        R=FunFeatures(a=1.2, μ=np.pi*1., σ=.1),
        S=FunFeatures(a=-.3, μ=np.pi*13/12., σ=.1),
        T=FunFeatures(a=.4, μ=np.pi*3/2., σ=.4),
        RR=1.
)

fs, Nb = 256, 15
f_params = .1, .01, .25, .01, .5
t_params = 1., .2
(t, rr), (f, psd) = tachogram(f_params, t_params, Nb=Nb, fs=fs, scaling=True)

fes = tachogram_features(fe, rr, fs)

sim = Simulator(fs=fs, ζ=.1)
t, θ, ρ, z = sim.solve(features=fes)

p = Plotter(_2d=True, nrows=2, ncols=1, figsize = (12.,5.))
p.axs[0].plot(t, z, '-k')
p.axs[0].set_ylabel('Voltage [mV]')
p.axs[0].set_title('Case w/RR process (noiseless \& noisy)')

sim.add_noise(z, beta=2, snr=4, seed=0, in_place=True)
p.axs[1].plot(t, z, '-k')
p.axs[1].set_ylabel('Voltage [mV]')
p.axs[1].set_xlabel('time [s]')

Plotter.save(folder='figs/', name=filename)
Plotter.show()