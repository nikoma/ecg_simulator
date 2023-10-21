from src.ecg_simulator import AbstractSimulator, repeater
from ecg_models import Human
import numpy as np 

from pathlib import Path
from geometric_plotter import Plotter 
filename = Path(__file__).stem

# make a list with a beat feature for each beat. In this case, a Human model from ECG Models repo.
fes = list(repeater([Human.example_beat], repeat=10))

# Build the Simulator with the derivate of the model. For instance, five gaussian functions
class Simulator(AbstractSimulator):
    def dfdt(self, p, ω):
        return Human.dfdt(p, ω, self.fe)
    
# make an instance 
sim = Simulator(
    fs=512., # sampling frequency
    ζ=.1, # damping factor
    resp =(.1, .75) # respiration baseline (amplitud, frequency)
) 

# then, run the solver
t, θ, ρ, z = sim.solve(
    features=fes,
)

# plotting
p = Plotter(_2d=True, nrows=2, ncols=1, sharex=True, sharey=True, figsize=(15., 5.))

p.axs[0].plot(t, z, '-k')
p.axs[0].plot(t, .05*np.sin(2*np.pi*.75*t), linestyle='solid', color='gray')
p.axs[0].set_ylabel('Voltage [mV]')
p.axs[0].set_title('Noiseless \& noisy')

ax1r = p.axs[0].twinx()
ax1r.plot(t, θ % (2*np.pi), '--k')
ax1r.set_ylabel('$\\theta \; mod \; 2\\pi$')

sim.add_noise(z, beta=2, snr=4, seed=0, in_place=True)
p.axs[1].plot(t, z, '-k')
p.axs[1].set_ylabel('Voltage [mV]')
p.axs[1].set_xlabel('time [s]')

Plotter.save(folder='figs/', name=filename)
Plotter.show()