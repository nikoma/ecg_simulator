from geometric_plotter import Plotter
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
fes = list(repeater([fe], repeat=70))
sim = Simulator(fs=512., ζ=.1)
t, θ, ρ, z = sim.solve(features=fes)
xlim, ylim = sim.get_exp_lims(z, fes)

p = Plotter(_2d=True, figsize=(15., 5.))
p.axs.plot(t, z, '-k')
p.axs.axvline(xlim, color='k', linestyle='--')
p.axs.axhline(ylim, color='k', linestyle='--')
p.axs.set_ylabel('Voltage [mV]')
p.axs.set_title('Dumping effect and convergence')

p.save(folder='figs/', name=filename)
p.show()