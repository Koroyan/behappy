# Web Deployment (Vercel)

This guide explains how to deploy the Expo (React Native + expo-router) app to the web using **Vercel**.

## 1. Build

1. Ensure dependencies are installed:
   ```powershell
   npm install
   ```
2. Export static web build:
   ```powershell
   npm run build:web
   ```
3. (Optional) Preview locally:
   ```powershell
   npm run preview:web
   ```
   Serves the `dist` folder.

## 2. Deploy to Vercel

### A. One-time setup
1. Install Vercel CLI (optional):
   ```powershell
   npm install -g vercel
   ```
2. Login:
   ```powershell
   vercel login
   ```
3. Link project (inside repo root):
   ```powershell
   vercel
   ```
   Accept defaults; set output directory to `dist` if prompted.

### B. Configure
`vercel.json` (added) sets:
- `buildCommand`: `npm run build:web`
- `outputDirectory`: `dist`
- `devCommand`: `npm run web`

### C. Environment Variables
Set in Vercel dashboard (Project Settings → Environment Variables):
| Name | Value | Exposure |
|------|-------|----------|
| EXPO_PUBLIC_API_KEY | (public API key if safe) | Client |
| EXPO_PUBLIC_FLITT_MERCHANT_ID | your id | Client |
| EXPO_PUBLIC_FLITT_TEST_MODE | true/false | Client |
| OPENAI_API_KEY | your OpenAI key | Server ONLY (avoid prefix) |

Do **NOT** expose raw `OPENAI_API_KEY` to client; if current client code uses it directly, refactor calls to go through a server endpoint.

### D. Deployment
Manual:
```powershell
vercel --prod
```
Or rely on Git auto-deploy (push to main → Vercel builds automatically).

## 3. Routing Notes
Expo static export will create HTML per route under `dist`. No custom rewrites needed unless you introduce dynamic server routes. Keep `vercel.json` minimal.

## 4. Updating
After code changes:
```powershell
npm run build:web
vercel --prod
```

## 5. Troubleshooting
| Issue | Fix |
|-------|-----|
| Blank page / 404 | Ensure `dist` contains `index.html` and route folders; rebuild. |
| Missing env vars | Re-add in Vercel dashboard; trigger redeploy. |
| AI key exposed | Move AI requests to an API route or server securely. |
| Skia / native module errors | Conditional imports: `if (Platform.OS !== 'web')` before using the module. |

## 6. Optional: CI
Add GitHub Action to confirm build:
```yaml
name: Web Build
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:web
      - uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: dist
```

## 7. Next Steps
- Refactor OpenAI usage to server proxy if still client-side.
- Add RTL direction handling on language change: `document.documentElement.dir = isRTL ? 'rtl' : 'ltr';`
- Performance audit: analyze bundle size (`dist/_expo/static/js`).

Enjoy your deployed web app! 🌐
