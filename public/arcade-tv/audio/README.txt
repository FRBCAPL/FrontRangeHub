Legends Arcade — TV celebration audio (4-part sequence)
=========================================================

Playback order on every high score:

  1. celebration.mp3              — Upbeat fanfare (you have this)
  2. celebration-congrats.mp3   — ElevenLabs intro voice
  3. [computer voice]           — player name only (automatic)
  4. celebration-outro.mp3      — ElevenLabs ending
     celebration-outro-top.mp3   — used instead when rank is #1

Create clips 2 and 4 on ElevenLabs (same voice for both):

  celebration-congrats.mp3 — export text:
    "Congratulations,"

  celebration-outro.mp3 — export text:
    "you made the leaderboard!"

  celebration-outro-top.mp3 — export text:
    "you got the new high score!"

Sounds like:  [fanfare] → "Congratulations," → "MIKE" → "you made the leaderboard!"

Tips:
  - End congrats with a comma so it flows into the name
  - Keep outro clips punchy; trim silence in an editor if needed
  - Missing files are skipped — fanfare still plays

Deploy to BOTH folders:
  services/arcade-events/static/tv/audio/
  FrontEnd/public/arcade-tv/audio/

Hard-refresh TV after adding files (Ctrl+F5).

Autoplay (no click on TV):
  On the Optiplex, open the TV with START-ARCADE-TV.bat — not a normal Chrome shortcut.
  That enables celebration audio without tapping the screen.
