from src.ecg_simulator import *
from ecg_models import Human
from pathlib import Path
from geometric_plotter import Plotter 
filename = Path(__file__).stem

fes = list(repeater([Human.example_beat], repeat=70))
class Simulator(AbstractSimulator):
    def dfdt(self, p, ω):
        return Human.dfdt(p, ω, self.fe)

sim = Simulator(fs=512., ζ=.1)
t, θ, ρ, z = sim.solve(features=fes)
xlim, ylim = sim.get_exp_lims(z, fes)

p = Plotter(_2d=True, figsize=(15., 5.))
p.axs.plot(t, z, '-k')
p.axs.axvline(xlim, color='k', linestyle='--')
p.axs.axhline(ylim, color='k', linestyle='--')
p.axs.set_ylabel('Voltage [mV]')
p.axs.set_title('Damping effect and convergence')

p.save(folder='figs/', name=filename)
p.show()