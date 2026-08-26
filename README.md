# Doodle T-Rex Runner

A small, original browser endless runner in Romka's hand-drawn sketchbook style. Jump over ground junk and hold Shift or Arrow Down to slide under flying hazards.

## Play locally

No build step and no backend are required. From PowerShell:

```powershell
py -m http.server 8080
```

Then open `http://127.0.0.1:8080`.

## Controls

- Space or Arrow Up: jump
- Shift or Arrow Down: slide
- P: pause/resume
- Touch buttons are shown on narrow screens

The best score is saved only in browser `localStorage`. The online leaderboard belongs to the full [romka.cc Lab build](https://romka.cc/lab/t-rex-runner/) and is deliberately not bundled here.

## Test

```powershell
npm test
```

## License

MIT — see [LICENSE](LICENSE).
