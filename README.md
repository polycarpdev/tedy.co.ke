<!-- README.md -->
# tedy.co.ke

A living memorial for **Thadeus Esirom "Tedy" Etyang** (07.07.1999 – 11.11.2026). Soldier in the Kenya Army, Manchester United fan, former No. 6, music maker, photographer, and the friend who brought everyone together over coffee, grills and hikes.

This site keeps his story, his photos, his music and the memories of the people who loved him in one place.

## What it does

- Tells his life story as an interactive, scroll-driven timeline
- Photo gallery, including photos he took himself
- Music he produced with his brother
- A moderated memories wall where friends and family leave messages
- Loads instantly, works offline, installable as an app

## Stack

| Layer | Tech |
|---|---|
| Frontend | Astro (static), React islands, TypeScript, Tailwind CSS |
| Offline | Service worker |
| API | Node.js, Express |
| Database | PostgreSQL |
| CI/CD | GitHub Actions, Bash |
| Hosting | cPanel (LiteSpeed), Cloudflare |

## Development

```bash
npm install
npm run dev
```

## Deployment

1. Pushing to `main` triggers GitHub Actions, which builds the site and publishes it to the `deploy` branch.
2. On the server, `~/tedy-deploy/deploy.sh` pulls the `deploy` branch and syncs it into the document root. No builds run on the server.

## Credits

Built by his brother, [Polycarp Etyang](https://www.linkedin.com/in/polycarpdev/), with **Claude** (Anthropic) as a development collaborator for architecture, code and guidance.

Forever No. 6.
