# Deploying SPACES 360 — Step-by-Step Guide

Your app is a **pure frontend app** (no server needed). All data is stored in your browser's
localStorage. Once deployed, it works 24/7 from anywhere — phone, tablet, laptop — even when
your personal laptop is off.

---

## Option 1: Netlify Drop (EASIEST — no account needed for a quick link)

1. Run `npm run build` in this folder (creates the `dist/` folder)
2. Go to **https://app.netlify.com/drop**
3. Drag the entire `dist/` folder onto the page
4. You instantly get a live URL like `https://random-name-123.netlify.app`
5. Done! Open it on your phone.

**For a permanent URL with your own name:**
- Create a free Netlify account
- Connect it to a GitHub repo (or keep using drag-and-drop)
- Your URL won't change between re-deploys

---

## Option 2: Vercel (Fastest CDN)

1. Install Vercel CLI: `npm install -g vercel`
2. Run in this folder: `vercel`
3. Follow the prompts (log in, confirm settings)
4. You get a URL like `https://your-project.vercel.app`

**To redeploy after changes:**
```
npm run build
vercel --prod
```

---

## Option 3: GitHub Pages (Completely free, permanent)

1. Push this folder to a GitHub repo
2. Go to repo Settings → Pages
3. Source: **GitHub Actions**
4. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

5. Add your `GEMINI_API_KEY` as a GitHub repo secret (Settings → Secrets → Actions)

---

## Setting up API Keys on Hosted Version

The AI scanning feature needs your Gemini API key baked into the build.
Set environment variables **before** running `npm run build`:

**For Netlify** (Settings → Environment Variables):
- `GEMINI_API_KEY` = your key

**For Vercel** (Settings → Environment Variables):
- `GEMINI_API_KEY` = your key

**For local build** — create/update `.env.local`:
```
GEMINI_API_KEY=your_actual_key_here
```

---

## Installing as a Mobile App (PWA)

After opening the URL on your phone:

**Android (Chrome):**
- Tap the 3-dot menu → "Add to Home screen"
- The app installs like a native app

**iPhone (Safari):**
- Tap the Share button (box with arrow) → "Add to Home Screen"
- The app appears on your home screen

Once installed, the app works **offline** — your existing quotation data loads
even without internet (new ones sync when you're back online).

---

## Quick Rebuild & Redeploy

```bash
# After making changes:
npm run build
# Then drag dist/ to Netlify Drop again, or run: vercel --prod
```
