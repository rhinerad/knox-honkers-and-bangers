# Knoxville Honkers and Bangers website

The band's website: plain HTML and CSS, no build step, no frameworks.
Every change saved to the `main` branch goes live automatically through Cloudflare Pages.

## Pages

| File | Page |
|---|---|
| `index.html` | Home: hero, what's honk, next show, the band, join, book us |
| `shows.html` | Shows: next show, coming up, past shows (filled in from the band calendar) |
| `past-shows.html` | Past Shows: every show since 2023, by year, with a shows-per-year chart |
| `past-shows-archive.js` | The list behind Past Shows. Edit it to fix a show or add one that was never on the calendar |
| `gallery.html` | Photos & videos |
| `mission.html` | Mission statement (**still a draft: rewrite it in the band's own words**) |
| `links.html` | Link-in-bio page for Instagram (put `yoursite/links.html` in the bio) |
| `styles.css` | Colors, fonts and layout for every page |
| `site-config.js` | API key, calendar ID and photo folder ID: the one file to edit to connect Google |
| `calendar.js` | Reads the Google Calendar and builds the show lists |
| `photos.js` | Reads the band's Drive photo folder: rotating photos, Gallery section, a photo per gig |
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

**Add photos (easiest way)**
Drop them into the band's website photo folder on Google Drive (link below). Once the folder is
connected, every photo in it shows up in the rotating photo spots on Home and Mission and in the
Gallery's "From the band's photo folder" section. No GitHub needed.
- **Gig group photos:** start the file name with the gig's date, e.g. `2026-07-04 Freedom Thighs.jpg`.
  It then appears next to that gig on the Past Shows page, and the caption reads "Freedom Thighs · Jul 4, 2026".
- Other photos: name them what you want the caption to say (`Band Camp sunset.jpg`). Camera names
  like `IMG_1234.jpg` just show without a caption.
- Anything in that folder is public on the website, so only put in photos the band is happy to share.

**Add a photo by hand (no Drive)**
Upload it to `images/` (under about 1 MB), then add it to the `LOCAL` list at the top of `photos.js`
to put it in the rotation, or copy a `<figure class="tile">` block in `gallery.html`.

**Add or fix a past show**
Open `past-shows-archive.js`, click the pencil, and copy one of the lines in the list.
Change the date, title and place, then commit. New gigs that go on the band calendar show up
on the Past Shows page by themselves once they're over, so this is only for fixes and old shows.

## Things still to fill in

- [ ] Band Instagram handle (search the files for `[YOUR INSTAGRAM HANDLE]`)
- [ ] Real lineup on the Home page (the "Swap this for your real lineup" note in `index.html`)
- [ ] More photos: the SoKno Pride 2025 set by photographer Taryn Ferro (credit her on the Gallery page) and any video clips
- [ ] Photo credits for the Band Camp 2024 photographer
- [ ] Mission statement in the band's own words
- [ ] Connect Google: the live calendar and the photo folder (below)

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

## Connecting Google (calendar + photo folder)

Everything goes in one file: **`site-config.js`**. Until it's filled in, the Shows page uses the
saved list in `shows-snapshot.js` and the photo spots rotate through the photos in `images/`.

1. **Share the photo folder** (whoever owns it): open the band's website photo folder
   (https://drive.google.com/drive/folders/1QSTtz3p39yRsSGhkjWqukfPnt6KJzay-) → **Share** →
   General access → **Anyone with the link** → Viewer. Visitors can't see the photos otherwise.
2. **Make a public shows calendar** (whoever manages knoxhonkersandbangers@gmail.com):
   Google Calendar → Other calendars **+** → Create new calendar → "Knox H&B Shows".
   In its settings, under Access permissions, tick **Make available to public**.
   Copy the **Calendar ID** from "Integrate calendar". (The main band calendar has practices at
   members' homes and private events, so don't make that one public.)
   Tip: put "Showtime 7pm" in an event's description and the site shows the showtime instead of the call time.
3. **Get a free Google API key**: https://console.cloud.google.com → new project →
   APIs & Services → Library → enable **Google Calendar API** and **Google Drive API** →
   Credentials → Create API key. Restrict it to your website's address and to those two APIs.
4. **Paste** the API key and Calendar ID into `site-config.js` and commit. The photo folder ID is already there.

The site never shows events whose title contains practice, rehearsal, sectional, meeting,
band camp, cancelled, wedding or private. Add `#private` to any event's description to hide it too.

## Hosting (Cloudflare Pages)

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repository.
Framework preset: **None**. Build command: *(leave empty)*. Build output directory: `/`.
After that, every commit to `main` publishes automatically.
