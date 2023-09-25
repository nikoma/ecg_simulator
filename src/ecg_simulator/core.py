import copy
import json
import numpy as np
import scipy as sp
from typing import Callable, Literal, TypedDict, Tuple
import colorednoise as cn 

class FunFeatures(TypedDict):
    a: float # V   
    μ: float # rad
    σ: float # rad

class BeatFeatures(TypedDict):
    P: FunFeatures
    Q: FunFeatures
    R: FunFeatures
    S: FunFeatures
    T: FunFeatures
    RR: float

def v(θ, fe: FunFeatures):
    return ( θ % (2*np.pi) - fe['μ'] ) / fe['σ']

def g(v, fe: FunFeatures):
    return fe['a'] * np.exp( -.5 * v**2 )

def dgdt(p, ω, fe: FunFeatures):
    θ, _, _ = p
    vi = v(θ, fe)
    return - g(vi, fe) * vi * ω / fe['σ']

def model(θ, fe: BeatFeatures):
    return  g(v(θ, fe['P']), fe['P']) + \
            g(v(θ, fe['Q']), fe['Q']) + \
            g(v(θ, fe['R']), fe['R']) + \
            g(v(θ, fe['S']), fe['S']) + \
            g(v(θ, fe['T']), fe['T'])

def repeater(iterable: Tuple, repeat: int = 1):
    for item in iter(iterable):
        for _ in range(repeat):
            yield item

class Simulator:

    def __init__(self) -> None:
        pass 

    def system(self, t, p, resp: Tuple[float, float] = (0., 0.)):
        θ, ρ, z = p

        A, fr = resp 
        wr = 2*np.pi*fr

        # beat selector
        if t >= self.acc:
            self.fe = next(self.features)
            self.acc += self.fe['RR']

        ω = 2*np.pi / self.fe['RR']
        return [ 
            ω,
            (1. - ρ ) * ρ,
            dgdt(p, ω, self.fe['P']) + 
            dgdt(p, ω, self.fe['Q']) + 
            dgdt(p, ω, self.fe['R']) + 
            dgdt(p, ω, self.fe['S']) + 
            dgdt(p, ω, self.fe['T']) -
            self.ζ * z + (A*wr)*np.sin(wr*t)
        ]
    
    def solve(self, fs: int, ζ: float, features: Tuple[BeatFeatures], N: int = 1, resp: Tuple[float, float] = None):

        self.ζ = ζ if ζ is not None else 0.
        self.N = N
        self.features = repeater(features, repeat=N)
        self.fe = next(self.features)
        self.acc = self.fe['RR']

        tend = np.sum([fe['RR'] * N for fe in features])
        t = np.arange(start=0, stop=tend, step=1./fs)

        θ0, ρ0, z0 = 0., 1., 0.
        θ, ρ, z = sp.integrate.solve_ivp(
            self.system if resp is None else lambda t, p: self.system(t, p, resp=resp),
            t_span = (t[0], t[-1]),
            y0 = [θ0, ρ0, z0], 
            t_eval = t,
            method='RK45',
            max_step=1./fs
        )['y']
        
        if self.ζ is None: # remove drift
            z -= np.repeat(z[::fs], fs)

        if (len(features) == 1) and (ζ > 0):
            self._lim = self.lim(z0, z[int(fs*self.fe['RR'])], ζ, self.fe['RR'])

        return t, θ, ρ, z

    @staticmethod
    def lim(z0: float, zRR: float, ζ: float, RR: float):
        return (zRR-z0) / (1 - np.exp(-RR*ζ)) , 4./ζ
    
    @staticmethod
    def add_noise(z: np.ndarray, beta: float, snr: float, seed=None, in_place=False):
        noise = cn.powerlaw_psd_gaussian(beta, z.size, random_state=seed)
        power_s = np.mean(z**2)
        power_n = power_s * np.power(10., -snr/10.)
        noise *= np.sqrt(power_n)
        if in_place:
            z += noise
        else:
            return z + noise


def random_features(mfes: BeatFeatures, sfes: BeatFeatures, N: int=100, seed: int = None):
    rng = np.random.default_rng(seed=seed)
    μs = vectorize(mfes)
    σs = vectorize(sfes)
    vs = rng.normal(μs, σs, size=(N, 3 * ( len(mfes) - 1 ) + 1))
    return [ modelize(l) for l in vs ]

def vectorize(fes: BeatFeatures) -> Tuple:
    vec = [ fes['RR'] ]
    vec += fes['P'].values()
    vec += fes['Q'].values()
    vec += fes['R'].values()
    vec += fes['S'].values()
    vec += fes['T'].values()
    return vec


def modelize(l: Tuple) -> BeatFeatures:
    return BeatFeatures(
        RR=l[0],
        P=FunFeatures(a=l[1], μ=l[2], σ=l[3]),
        Q=FunFeatures(a=l[4], μ=l[5], σ=l[6]),
        R=FunFeatures(a=l[7], μ=l[8], σ=l[9]),
        S=FunFeatures(a=l[10], μ=l[11], σ=l[12]),
        T=FunFeatures(a=l[13], μ=l[14], σ=l[15])
    )

class FeatureEditor:
    def __init__(self, f: BeatFeatures) -> None:
        self.model = copy.deepcopy(f)

    def __str__(self) -> str:
        return json.dumps(self.model, indent=4, ensure_ascii=False)
    
    def scale(self, value: float, feature: Literal['a', 'μ', 'σ'] = None):
        self.set(lambda x: x*value, feature=feature)

    def abs(self, feature: Literal['a', 'μ', 'σ'] = None):
        self.set(abs, feature=feature)

    def constant(self, value: float, feature: Literal['a', 'μ', 'σ'] = None):
        self.set(lambda x: value, feature=feature)

    def set(self, fun: Callable, feature: Literal['a', 'μ', 'σ'] = None):
        for k, v in self.model.items():
            if k == 'RR':
                continue
            if feature is None:
                v['a'] = fun(v['a'])
                v['μ'] = fun(v['μ'])
                v['σ'] = fun(v['σ'])
            else:
                v[feature] = fun(v[feature])
            