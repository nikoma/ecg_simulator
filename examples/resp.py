from geometric_plotter import Plotter
import matplotlib.pyplot as plt 
from src.ecg_simulator import BeatFeatures, FunFeatures, Simulator, FeatureEditor, repeater
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
fes = list(repeater([fe], repeat=10))
sim = Simulator(fs=512., ζ=.1, resp=(.15, .75))
t, θ, ρ, z = sim.solve(features=fes)

rfe = FeatureEditor(fe)
rfe.constant(0.,'a')
rfes = list(repeater([rfe.model], repeat=10))
t, θ, ρ, zr = sim.solve(features=rfes)

p = Plotter(_2d=True, nrows=2, ncols=1, sharex=True, sharey=True, figsize=(15., 5.))

p.axs[0].plot(t, z, '-k')
p.axs[0].plot(t, zr, '--k')
p.axs[0].set_ylabel('Voltage [mV]')
p.axs[0].set_title('Respiration effect $A = .15$ and $f = .75$')

sim.add_noise(z, beta=2, snr=4, seed=0, in_place=True)
p.axs[1].plot(t, z, '-k')
p.axs[1].plot(t, zr, '--k')
p.axs[1].set_ylabel('Voltage [mV]')
p.axs[1].set_xlabel('time [s]')


p.save(folder='figs/', name=filename)
p.show()