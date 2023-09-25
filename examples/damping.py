from geometric_plotter import Plotter
import matplotlib.pyplot as plt 
from src.ecg_simulator import BeatFeatures, FunFeatures, Simulator
from pathlib import Path
import numpy as np
filename = Path(__file__).stem
Plotter.set_export()

fes = [
    BeatFeatures(
        P=FunFeatures(a=.2, μ=np.pi*2/3., σ=.25),
        Q=FunFeatures(a=-.2, μ=np.pi*11/12., σ=.1),
        R=FunFeatures(a=1.2, μ=np.pi*1., σ=.1),
        S=FunFeatures(a=-.3, μ=np.pi*13/12., σ=.1),
        T=FunFeatures(a=.4, μ=np.pi*3/2., σ=.4),
        RR=1.
    )
]

sim = Simulator()

t, θ, ρ, z = sim.solve(fs=512., ζ=.1, features=fes, N=70)
fig, ax = plt.subplots(figsize=(15., 5.))

ax.plot(t, z, '-k')
ax.axhline(sim._lim[0], color='k', linestyle='--')
ax.axvline(sim._lim[1], color='k', linestyle='--')
ax.set_ylabel('Voltage [mV]')
ax.set_title('Dumping effect and convergence')

Plotter.save(folder='figs/', name=filename)
Plotter.show()