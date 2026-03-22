# GEMINI.md

Always add, commit, and push changes to the git repository with simple and understandable commit messages.

## Audio Profile Rule (The "Old LP Sound")
NEVER route the analog noise floor (hiss/crackle) or the background hum through a `WaveShaperNode` or apply mathematical distortion curves to them. This causes severe, painful digital buzzing.
1. **Hum:** Always use a smooth `sine` wave (e.g. at 50Hz) and restrict the maximum gain multiplier dynamically (e.g. to a max of `0.08` at 100% warmth). DO NOT use complex waveforms like `triangle` or `sawtooth` for the hum layer.
2. **Crackle/Hiss:** Always filter raw white noise with a `lowpass` `BiquadFilterNode` (sweeping roughly from 10k down to 2k) and cap the maximum master gain very strictly (e.g. `0.25` max at 100% crackle). Wait, these exact values ensure the vinyl texture stays a soft and pure ambient bed without overpowering the music or piercing the ears!
