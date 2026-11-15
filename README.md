# Infinisweeper

Infinite Minesweeper — an endless, scrollable, zoomable minefield with a global leaderboard.

🔗 **Live:** [infinisweeper.hackatoa.com](https://infinisweeper.hackatoa.com)   ·   ☕ **Support:** [Buy Me a Coffee](https://buymeacoffee.com/hackatoa)

## Overview

Minesweeper with no edges. The board generates as you go, so you can scroll and zoom forever. Compete for the best times/scores on the global leaderboard.

## Features

- Infinite procedurally-generated board (scroll + zoom)
- Global leaderboard
- Personal best score saved locally, shown on game over
- Keyboard zoom: `+` / `-` (alongside the on-screen zoom buttons)
- Share score: one-tap copy/share of your result from the game-over screen
- 6-language localization

## Tech Stack

HTML · vanilla JS · Firebase · Docker

## Development

```bash
cd public && python3 -m http.server 8080
```

## Deployment

Docker on the homelab games host; GHCR + Watchtower auto-deploy.

## Support

If this project is useful to you, consider supporting development:

☕ **[Buy Me a Coffee](https://buymeacoffee.com/hackatoa)**

---

Part of the **[Hackatoa](https://hackatoa.com)** ecosystem — self-hosted apps, browser games, and bots. · [All repositories »](https://github.com/Hackatoan)
