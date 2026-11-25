# Advantek AI² Security & Compliance

## What's included

- `index.html`, `styles.css`, `hero.js`, `funnel.js`: the interactive mid-market landing page, with finance and IT buyer perspectives and a preview handoff into scheduling.
- `schedule/index.html`: branded two-column scheduling experience with a real date picker UI, sample time selection, auto-detected browser timezone and manual timezone switching.
- `thank-you/index.html`: branded, truthful confirmation preview, showing the chosen sample date/time when the browser session is available.
- `booking.css`: new responsive design layer for the two pages; Quicksand headings, Mulish body, Advantek blue `#055c95`, subtle cybersecurity imagery.
- `booking.js`: accessible calendar interactions and preview-state display. No external services.

The tracked `assets/` folder includes the Advantek logo, product walkthrough, and poster.

## Run locally

From the repository root, run:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` to start the three-step preview.

## Flow

1. Fill the existing two-step landing form (sample details only). The JS validates both steps and saves the first name, selected priority, and an optional finance or IT/security audience tag in sessionStorage for this tab. It does not store email or phone.
2. Redirect to `schedule/?preview=1`. Select a weekday in the next three calendar months, then an **illustrative** time slot. Browser timezone is auto-detected; you can change it. Sample dates are defined in Eastern Time and translated for display.
3. Click **Preview confirmation**. The sample selection is stored in sessionStorage and the browser goes to `thank-you/?preview=1`. The screen explicitly says **PREVIEW ONLY — NOT BOOKED**.

## Important — production integration is still required

This package does **not** provide real appointment availability, reserve a meeting, generate calendar invites, send emails, or submit the lead to Advantek's CRM. Sample slots are illustrative and must **not** be exposed as real availability.

Before a public launch, connect Advantek's actual scheduling provider or booking backend, replace sample slots with returned live availability, submit leads securely to its approved CRM, configure booking redirects, and display a success message **only after a server-verified booking**. Do not trust a query parameter alone as proof of a confirmed booking.

## Review checks

The landing, scheduling, and confirmation pages were exercised under the GitHub Pages project path at 320, 390, 768, 961, 1024, and 1440 CSS pixels. The browser checks followed finance, IT/security, and GRC selections through both redirects and checked audience-specific agendas, priorities, timezone display, and the preview receipt. Older preview records and direct visits are also supported.
