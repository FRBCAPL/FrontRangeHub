Legends Arcade — TV celebration audio (4-part sequence)
=========================================================

Playback order:

  1. celebration.mp3
  2. Congrats voice (ElevenLabs)
  3. [computer voice] — player name only
  4. Outro voice (ElevenLabs)

Accepted filenames (any one name per slot works):

  Slot 1 — fanfare:
    celebration.mp3

  Slot 2 — congrats:
    celebration-congrats.mp3   OR   Congratulations.mp3

  Slot 4 — leaderboard outro:
    celebration-outro.mp3        OR   leaderboard.mp3

  Slot 4 — rank #1 outro:
    celebration-outro-top.mp3    OR   New High Score.mp3

ElevenLabs text to generate:

  Congratulations.mp3     →  "Congratulations,"
  leaderboard.mp3         →  "you made the leaderboard!"
  New High Score.mp3      →  "you got the new high score!"

Deploy to BOTH folders:
  services/arcade-events/static/tv/audio/
  FrontEnd/public/arcade-tv/audio/

Then push to GitHub / redeploy so frontrangepool.com serves the MP3s.

Hard-refresh TV (Ctrl+F5). Use START-ARCADE-TV.bat for autoplay (no click).
