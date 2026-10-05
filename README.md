# Knoxville Honkers and Bangers website

The band's website: plain HTML and CSS, no build step, no frameworks.
Every change saved to the `main` branch goes live automatically through Cloudflare Pages.

## Pages

| File | Page |
|---|---|
| `index.html` | Home: hero, what's honk, next show, the band, join, book us |
| `shows.html` | Shows: next show, coming up, past shows (filled in from the band calendar) |
| `gallery.html` | Photos & videos |
| `mission.html` | Mission statement (**still a draft: rewrite it in the band's own words**) |
| `links.html` | Link-in-bio page for Instagram (put `yoursite/links.html` in the bio) |
| `styles.css` | Colors, fonts and layout for every page |
| `calendar.js` | Reads the Google Calendar and builds the show lists |
| `shows-snapshot.js` | Saved copy of the gigs, used until the live calendar is connected |
| `images/` | Put band photos and short video clips here |

## How to help (no installs needed)

**Fix some text**
1. Open the page's file above (for example `mission.html`).
2. Click the ✏️ pencil icon at the top right of the file.
3. Change the words between the tags. Leave the `<tags>` themselves alone.
4. Click **Commit changes**, write a short note about what you changed, and commit.
5. The live site updates in about a minute.

**Bigger edits**
Press the `.` key while viewing the repository. A full code editor opens in your browser.
Edit as many files as you like, then use the Source Control panel (left side) to commit.

**Try something without changing the live site**
When you commit, choose **"Create a new branch"**. Cloudflare builds a private preview link
for that branch so the band can look before anything goes live. When it looks good,
open a **Pull request** and merge it into `main`.

**Add a photo to the gallery**
1. Open the `images/` folder → **Add file → Upload files** → drop the photo in → commit.
2. In `gallery.html`, find the tile you want (each one is a `<figure class="tile ...">`).
3. Replace everything inside its `<div class="tile-media ...">` with
   `<img src="images/your-photo.jpg" alt="Short description of the photo">`.
Keep photos under about 1 MB (shrink them first if they're straight off a phone).
Short clips work the same way with `<video src="images/clip.mp4" controls playsinline></video>`.

## Things still to fill in

- [ ] Band Instagram handle (search the files for `[YOUR INSTAGRAM HANDLE]`)
- [ ] Real lineup on the Home page (the "Swap this for your real lineup" note in `index.html`)
- [ ] Real photos and videos in the gallery
- [ ] Mission statement in the band's own words
- [ ] Connect the live Google Calendar (below)

## Band colors

| Name | Hex | Used for |
|---|---|---|
| Neon pink | `#FF2E97` | Main band color, headlines, buttons |
| Black | `#0C090D` | Background |
| Brass gold | `#FFC83D` | Times, highlights |
| Electric violet | `#9A63FF` | Small accents |
| Soft white | `#FFF2F8` | Body text |

Fonts: **Bungee** (headlines), **Archivo** (body), **IBM Plex Mono** (labels), all from Google Fonts.
All colors live at the top of `styles.css`, so change one there and it changes everywhere.

## Connecting the live Google Calendar

Until this is done, the Shows page uses the saved list in `shows-snapshot.js`.

The current band calendar also has practices at members' homes and private events, and a
calendar has to be **public** for a website to read it. So the safe setup is a separate
public calendar with only gigs on it.

1. **Make a public shows calendar** (whoever manages knoxhonkersandbangers@gmail.com):
   Google Calendar → Other calendars **+** → Create new calendar → "Knox H&B Shows".
   In its settings, under Access permissions, tick **Make available to public**.
   Copy the **Calendar ID** from "Integrate calendar".
   Tip: put "Showtime 7pm" in an event's description and the site shows the showtime instead of the call time.
2. **Get a free Google API key**: https://console.cloud.google.com → new project →
   APIs & Services → Library → enable **Google Calendar API** → Credentials → Create API key.
   Restrict it to your website's address and to the Calendar API only.
3. **Paste both** at the top of `calendar.js` (`calendarId` and `apiKey`) and commit.

The site never shows events whose title contains practice, rehearsal, sectional, meeting,
band camp, cancelled, wedding or private. Add `#private` to any event's description to hide it too.

## Hosting (Cloudflare Pages)

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repository.
Framework preset: **None**. Build command: *(leave empty)*. Build output directory: `/`.
After that, every commit to `main` publishes automatically.
