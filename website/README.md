# The Digital Agila website

Static site: `index.html`, `about.html`, `services.html` and `contact.html`, with assets in `assets/`. It has no build step.

## Preview locally
```
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Then open http://localhost:5173. The 3D desk needs a local server; double-clicking the HTML files won't load it.

## Palettes (preview)
Three colour brandings are built in. Switch with the bar at the bottom of the page, or open `?theme=a`, `?theme=b` or `?theme=c`:
- A: Paper & Amber (light, warm)
- B: Obsidian & Ember (dark, glowing; closest to the reference video)
- C: Glacier & Gold (light, cool navy)
Once one is chosen, make it the default and remove the switcher (`.palette` in style.css and the switcher block in main.js).

## Home: the interactive desk
`index.html` is a full-screen 3D desk (`assets/js/desk.js`, styles in `assets/css/desk.css`), built entirely in code with no 3D model downloads. Every object responds:
- Laptop → services desktop (links to services.html)
- Tablet → growth dashboard (sample data, labelled as such)
- Phone → short scripted chat ending in "Book a free strategy call"
- Notebook → our story · Business card → contact details · Lead printer → prints an example "new lead" receipt
- Lamp → day / night · Mug → sip · Plant → water it · Picture frame (eagle photo) → our story
- Smart speaker → a colour light show that washes onto the desk · Turntable → stop / start the record (the tone arm lifts and drops)
- Decorative props: reading glasses, pen cup and handwritten sticky notes
- A 3D bald eagle flies a 24-second loop around the room (`buildFlight` in desk.js): wingbeats when climbing or turning, glides when descending, banks into turns, and two swoops pass close to the camera. The swoop points are worked out from the camera position, so they stay close on any screen size.

The text on each screen lives in the HTML `[data-ui]` panels (so Google can read it); `desk.js` lays each panel exactly over its 3D screen. On phones the laptop and tablet open as full-size panels instead. Screen behaviour lives in `assets/js/desk-ui.js`.

### Testing hook
Add `?debug` to the address to get `window.__desk` in the browser console:
- `__desk.screenOf('turntable')`: an object's position on screen
- `__desk.eagle()`: where the eagle is and how far it is from the camera
- `__desk.holdEagle(0.37)`: freeze the eagle at a point on its loop (`holdEagle(null)` lets it fly again)
- `__desk.state()`: record, speaker and day / night state

## Eagle photo
The picture frame on the desk shows `assets/img/eagle-flight.jpg`. `assets/img/eagle-front.jpg` is no longer used on the site. Before launch, confirm you have the rights to use the eagle photo.

## Brand
- Name: The Digital Agila ("agila" is Filipino for eagle)
- Tagline: See further. Grow higher.
- Colours: paper `#eeece7`, ink `#0f0f0f`, eagle-eye amber `#e39b2b` (deep amber `#a8650f` for text on light)
- Type: Instrument Sans + Instrument Serif (italic)
- Logo mark: `assets/img/mark.svg` (eagle head with the Philippine eagle's crest)

## Still to replace
- Founder portrait of Jayson Perucho: add `assets/img/portrait.jpg` and uncomment the `<img>` in about.html
- `hello@thedigitalagila.com` is shown on the site as the contact email: set up that mailbox (or forward it to your Gmail, e.g. with Cloudflare Email Routing)
- `assets/img/og-image.jpg` (1200×630 social share image)
- Check the "Within 1 business day" reply-time claim on contact.html

## Contact form (Cloudflare Pages Function + Resend)
The form on contact.html posts to `/api/contact`, a Cloudflare Pages Function in `functions/api/contact.js` (repo root, next to this `website` folder). For each real inquiry it sends two emails through [Resend](https://resend.com):
- **To you** (`TO_EMAIL`, default jaysperucho@gmail.com): "New inquiry from {name}", with every field and a one-click reply. Its reply-to is the lead, so hitting reply answers them directly.
- **To the lead**: "Thanks, {first name}. We received your inquiry", with next steps and a copy of what they sent. Its reply-to is you.

Email designs live in `server/emails.js`. Spam protection: a hidden honeypot field, a "submitted too fast" check, and posts from other websites are refused. Bots get a fake success so they don't retry.

### One-time setup
1. **Resend**: create a free account at resend.com, add thedigitalagila.com (Domains → Add domain), and add the DNS records it shows. If the domain's DNS is on Cloudflare, Resend can add them for you. Wait until the domain shows **Verified**, then create an API key (API Keys → Create, "Sending access").
2. **Cloudflare** → Workers & Pages → your project → Settings → Variables and Secrets:
   - `RESEND_API_KEY` = the key from step 1, added as **Secret** (required)
   - `FROM_EMAIL` (optional): defaults to `The Digital Agila <hello@thedigitalagila.com>`; any sender must be on the domain you verified in Resend
   - Optional: `TO_EMAIL` (where notifications go), `REPLY_TO` (where leads' replies go, defaults to `TO_EMAIL`), `SITE_URL` (your live address, used in the emails), `TIME_ZONE` (for the "received" time, e.g. `Asia/Manila`; default UTC)
3. **Cloudflare build settings** (Settings → Build): **Root directory** must be the repository root (blank or `/`), and **Build output directory** must be `website`. If the root directory is set to `website`, Cloudflare won't find the `functions` folder: either change the setting, or move `functions/` and `server/` inside `website/`.
4. Redeploy, send yourself a test inquiry from the live Contact page, and check both inboxes (and spam folders, the first time).

If the API key is missing, visitors see a "didn't go through" message and the Cloudflare logs say `RESEND_API_KEY is not set`. If only the lead's confirmation fails (e.g. the domain isn't verified yet), you still get the notification, with a red warning line saying the confirmation could not be sent.

The local preview server (`serve.ps1`) can't run Cloudflare Functions, so submitting the form locally shows the error message. That's expected; it works once deployed.
