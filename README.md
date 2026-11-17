# Advantek Cybersecurity AI — Scheduling + Thank-You v4

## What's included

- `index.html`, `styles.css`, `hero.js`, `funnel.js`: existing approved interactive landing page with minimal preview context handoff into scheduling.
- `schedule/index.html`: branded two-column scheduling experience with a real date picker UI, sample time selection, auto-detected browser timezone and manual timezone switching.
- `thank-you/index.html`: branded, truthful confirmation preview, showing the chosen sample date/time when the browser session is available.
- `booking.css`: new responsive design layer for the two pages; Quicksand headings, Mulish body, Advantek blue `#055c95`, subtle cybersecurity imagery.
- `booking.js`: accessible calendar interactions and preview-state display. No external services.

**The existing `assets/` directory is NOT included and must stay in place**, including `assets/advantek-logo.png` and your Blackwire video/poster files.

## Install safely

From your `advantek-cybersecurity-funnel` directory:

```bash
mkdir -p backup-before-booking-v4
cp -p index.html styles.css hero.js funnel.js backup-before-booking-v4/
[ ! -d schedule ] || cp -R schedule backup-before-booking-v4/
[ ! -d thank-you ] || cp -R thank-you backup-before-booking-v4/
[ ! -f booking.css ] || cp -p booking.css backup-before-booking-v4/
[ ! -f booking.js ] || cp -p booking.js backup-before-booking-v4/
unzip -o ~/Downloads/advantek-booking-flow-v4.zip -d .
```

Continue using the same local preview server you already use, then visit:

- `http://127.0.0.1:8765/` — landing page
- `http://127.0.0.1:8765/schedule/?preview=1` — calendar
- `http://127.0.0.1:8765/thank-you/?preview=1` — thank-you preview

## Flow

1. Fill the existing two-step landing form (sample details only). The JS validates both steps and saves just the first name and selected security priority in sessionStorage for this tab. It does not store email or phone.
2. Redirect to `schedule/?preview=1`. Select a weekday in the next three calendar months, then an **illustrative** time slot. Browser timezone is auto-detected; you can change it. Sample dates are defined in Eastern Time and translated for display.
3. Click **Preview confirmation**. The sample selection is stored in sessionStorage and the browser goes to `thank-you/?preview=1`. The screen explicitly says **PREVIEW ONLY — NOT BOOKED**.

## Important — production integration is still required

This package does **not** provide real appointment availability, reserve a meeting, generate calendar invites, send emails, or submit the lead to Advantek's CRM. Sample slots are illustrative and must **not** be exposed as real availability.

Before a public launch, connect Advantek's actual scheduling provider or booking backend, replace sample slots with returned live availability, submit leads securely to its approved CRM, configure booking redirects, and display a success message **only after a server-verified booking**. Do not trust a query parameter alone as proof of a confirmed booking.

## Quality checks

- JS syntax checked with Node.
- CSS parsed without syntax errors.
- Rendering / UI interactions assessed at widths 320, 390, 768, 1024 and 1440 px using browser `set_content` harness; no overflow or page-script errors in those checks.
- Eastern and Asia/Kolkata conversions visually checked (e.g. 10:00 AM EST → 8:30 PM IST).
- Full HTTP browser navigation could not be executed in this container because local network navigation is blocked by the environment; verify redirect flow on your local server.
