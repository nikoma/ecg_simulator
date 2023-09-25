from geometric_plotter import Plotter
import matplotlib.pyplot as plt 
from src.ecg_simulator import BeatFeatures, FunFeatures, Simulator, FeatureEditor
from pathlib import Path
import numpy as np
filename = Path(__file__).stem
Plotter.set_export()

fe = BeatFeatures(
        P=FunFeatures(a=.2, μ=np.pi*2/3., σ=.25),
        Q=FunFeatures(a=-.2, μ=np.pi*11/12., σ=.1),
        R=FunFeatures(a=1.2, μ=np.pi*1., σ=.1),
        S=FunFeatures(a=-.3, μ=np.pi*13/12., σ=.1),
        T=FunFeatures(a=.4, μ=np.pi*3/2., σ=.4),
        RR=1.
)

sim = Simulator()

t, θ, ρ, z = sim.solve(fs=512., ζ=1., features=[fe], N=10, resp=(.15, .75))

rfe = FeatureEditor(fe)
rfe.constant(0.,'a')

t, θ, ρ, zr = sim.solve(fs=512., ζ=1., features=[rfe.model], N=10, resp=(.15, .75))
fig, [ax1, ax2] = plt.subplots(2, 1, sharex=True, sharey=True, figsize=(15., 5.))

ax1.plot(t, z, '-k')
ax1.plot(t, zr, '--k')
ax1.set_ylabel('Voltage [mV]')
ax1.set_title('Respiration effect $A = .15$ and $f = .75$')

sim.add_noise(z, beta=2, snr=4, seed=0, in_place=True)
ax2.plot(t, z, '-k')
ax2.plot(t, zr, '--k')
ax2.set_ylabel('Voltage [mV]')
ax2.set_xlabel('time [s]')


Plotter.save(folder='figs/', name=filename)
Plotter.show()