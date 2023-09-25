from geometric_plotter import Plotter
import matplotlib.pyplot as plt 
from src.ecg_simulator import BeatFeatures, FunFeatures, Simulator, FeatureEditor, random_features
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

editor = FeatureEditor(fes[0])
editor.scale(0.01, feature='μ')
editor.scale(0.2, feature='σ')
editor.scale(.2, feature='a')
editor.abs(feature='a')
editor.model['RR'] = .05

fes = random_features(
    fes[0],
    editor.model,
    N=8,
    seed=0
)

sim = Simulator()
t, θ, ρ, z = sim.solve(fs=512., ζ=.1, features=fes, N=1)
fig, [ax1, ax2] = plt.subplots(2, 1, sharex=True, sharey=True, figsize=(15., 5.))

ax1.plot(t, z, '-k')
ax1.set_ylabel('Voltage [mV]')
ax1.set_title('Case with variability in the features (noiseless \& noisy)')

ax1r = ax1.twinx()
ax1r.plot(t, θ % (2*np.pi), '--k')
ax1r.set_ylabel('$\\theta \; mod \; 2\\pi$')

sim.add_noise(z, beta=2, snr=4, seed=0, in_place=True)
ax2.plot(t, z, '-k')
ax2.set_ylabel('Voltage [mV]')
ax2.set_xlabel('time [s]')

Plotter.save(folder='figs/', name=filename)
Plotter.show()