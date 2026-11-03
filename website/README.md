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
- A 3D bald eagle flies a long loop around the room (`flightPath` in desk.js): wingbeats when climbing or turning, glides when descending, banks into turns

The text on each screen lives in the HTML `[data-ui]` panels (so Google can read it); `desk.js` lays each panel exactly over its 3D screen. Screen behaviour lives in `assets/js/desk-ui.js`.

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
- `www.thedigitalagila.com` and `hello@thedigitalagila.com` are assumed; update them if your domain differs
- `assets/img/og-image.jpg` (1200×630 social share image)
- Check the "Within 1 business day" reply-time claim on contact.html

## Contact form
The form uses Netlify Forms. It starts working once the site is deployed on Netlify (drag the `website` folder into app.netlify.com/drop). Submissions show up under Site → Forms.
