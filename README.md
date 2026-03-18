# Private Browser - Vite + React + Tailwind CSS

A private browsing tool with password protection and tab disguise features. Ready to import into Lovable, Bolt, or run locally.

## Features

- **Password Gate** - Protects access with a password
- **Private Browser** - Browse websites with a disguised interface
- **Security Settings** - Configure panic key, auto-lock, and escape URL
- **Security Log** - Track all security events
- **Tab Disguise** - Custom tab title and favicon

## For Bolt.new (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/private-browser.git
   git push -u origin main
   ```

2. **Open in Bolt**
   - Go to [bolt.new](https://bolt.new)
   - Click "Open Repo" or use: `bolt.new/github.com/YOUR_USERNAME/private-browser`
   - Bolt will automatically detect the Vite + React project

3. **Set Environment Variables** (if needed)
   - In the terminal: `export APP_PASSWORD=your-password`

## For Lovable

1. Push to GitHub (same as above)

2. **Import to Lovable**
   - Go to [lovable.dev](https://lovable.dev)
   - Click "Import from GitHub"
   - Select your repository

3. Note: Lovable uses Next.js by default - you may need to convert back to Next.js or use Lovable's Vite template

## For Local Development

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Key Adaptations

Since these are web-based platforms, some browser-specific features are adapted:

| Original Feature | Web Adaptation |
|-----------------|----------------|
| Tab cloaking | Fake browser chrome with custom title/favicon |
| DevTools guard | Limited detection |
| Panic key | Escape key redirects to configured URL |
| Proxy bypass | Server proxy for fetching sites |

## Note

This is a privacy-focused browser tool. Use responsibly.
