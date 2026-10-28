# Security Policy

## Supported Versions

Infinisweeper is a static web application without versioned releases. Security updates are applied directly to the live deployment.

| Status  | Version              |
| ------- | -------------------- |
| Current | Live (infinisweeper.hackatoa.com) |

## Security Measures

- **Firestore Rules**: Leaderboard submissions are validated server-side with strict Firestore Security Rules. Score data is verified to match submitted gamestate to prevent cheating.
- **Input Validation**: Username input is sanitized, trimmed, length-limited (40 chars), and filtered for profanity and slurs.
- **Content-Security-Policy**: Configured to restrict script execution to trusted sources (Firebase, Google, Cloudflare).
- **HTTPS Only**: All traffic is encrypted in transit.
- **Anonymous Auth**: No accounts required; optional Google Sign-In for cross-device board sync (games-7e2c4 project).

## Known Limitations

- **No Rate Limiting**: Firestore has no per-user rate limit in the rules (relies on Firebase backend limits). An attacker could theoretically spam leaderboard submissions using multiple anonymous sessions.
- **Hardcoded Firebase Key**: The games-7e2c4 API key is embedded in script.js for cross-device sync. This is unavoidable on a static-hosting site without a backend, and the key is restricted in the Firebase console to games-7e2c4 project only.

## Reporting a Vulnerability

Report security issues responsibly to **jacobprestonharris at gmail.com** with the subject line "Security: infinisweeper".

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We request 30 days to patch before public disclosure.
