from geometric_plotter import Plotter
import matplotlib.pyplot as plt 
from src.ecg_simulator import BeatFeatures, FunFeatures, Simulator, repeater
from pathlib import Path
import numpy as np
filename = Path(__file__).stem

fe = BeatFeatures(
        P=FunFeatures(a=.2, μ=np.pi*2/3., σ=.25),
        Q=FunFeatures(a=-.2, μ=np.pi*11/12., σ=.1),
        R=FunFeatures(a=1.2, μ=np.pi*1., σ=.1),
        S=FunFeatures(a=-.3, μ=np.pi*13/12., σ=.1),
        T=FunFeatures(a=.4, μ=np.pi*3/2., σ=.4),
        RR=1.
)

fes = list(repeater([fe], repeat=8))
sim = Simulator(fs=512., ζ=.1)
t, θ, ρ, z = sim.solve(features=fes)

p = Plotter(_2d=True, nrows=2, ncols=1, sharex=True, sharey=True, figsize=(15., 5.))

p.axs[0].plot(t, z, '-k')
p.axs[0].set_ylabel('Voltage [mV]')
p.axs[0].set_title('Case w/o variability in the features (noiseless \& noisy)')

ax1r = p.axs[0].twinx()
ax1r.plot(t, θ % (2*np.pi), '--k')
ax1r.set_ylabel('$\\theta \; mod \; 2\\pi$')

sim.add_noise(z, beta=2, snr=4, seed=0, in_place=True)
p.axs[1].plot(t, z, '-k')
p.axs[1].set_ylabel('Voltage [mV]')
p.axs[1].set_xlabel('time [s]')

Plotter.save(folder='figs/', name=filename)
Plotter.show()