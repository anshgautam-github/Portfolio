# Portfolio – Contact / footer section

React + Vite + Tailwind CSS v4 + GSAP (ScrollTrigger).

```bash
npm install
npm run dev
```

- Copy, links and partner wordmarks: `src/content.js`
- Layout & motion: `src/components/Contact/Contact.jsx`
- Swap `Figure.jsx` for your own cut-out photo (`<img>` with a transparent PNG) and the partner text for real logos.

## Security headers (Vercel)

`vercel.json` sets HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, `X-Frame-Options` and a Content-Security-Policy.
The CSP currently ships as `Content-Security-Policy-Report-Only`: open a Vercel **preview** deployment, scroll the whole page with DevTools open,
and if the console shows no "Content Security Policy" violations, rename the key to `Content-Security-Policy` to enforce it.

- If you set `SHOW_KIMI = true` (`FreefallStory.jsx`) the 3D block loads its models/textures from `https://storage.getlayers.ai`: add that host to
  `img-src` and `connect-src` (or self-host those files). three.js and the Draco decoder are bundled, no CDN needed.
- A new third-party script, font, image host or API must be added to the matching CSP directive.

## Tests

`npm test` runs the Node built-in test runner (`tests/`): sticky-note storage validation and the HTML escaping helper.
