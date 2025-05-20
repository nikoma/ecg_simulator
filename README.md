# ECG Simulator

This repository provides a simple browser based ECG waveform simulator.  It was
initially adapted from the older Python implementation but no Python utilities
are required anymore.  The core logic is contained in a small JavaScript module
that generates a synthetic ECG signal using Gaussian waves.

## Structure

```
js/                   Minimal JavaScript simulator
  ecg_simulator.js    Main module used in the example page
  wave_patterns.json  Parameters describing the waveform
  index.html          Example HTML page running the simulator
web/                  Larger demo application with UI controls
```

### Wave patterns

The shape of each ECG wave is defined in `js/wave_patterns.json`.  The file
contains the arrays `Ti`, `ai` and `bi` used by `ecg_simulator.js`.  Updating the
JSON allows tweaking the waveform without modifying any code.

### Running the example

Open `js/index.html` in a modern browser with JavaScript modules enabled.  The
page imports `ecg_simulator.js`, loads the wave parameters from the JSON file and
draws a short ECG trace on a canvas.  No additional build tools or dependencies
are needed.

The `web/` directory contains a more feature rich demo with multiple leads and
interactive controls.  It can be served as static files in the same way.

## Development

The simulator is implemented using standard ES modules so it should run in any
recent browser.  If you wish to customise the default waveform, edit
`js/wave_patterns.json` and refresh the page.
