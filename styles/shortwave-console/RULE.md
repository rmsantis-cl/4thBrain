# Style rule: Field Radio Logbook

**Accepted:** 2026-08-18, from `styles/shortwave-console/sample-v3.html`.
**Tokens:** `styles/shortwave-console/tokens.css`.
**Canonical reference:** `styles/shortwave-console/sample-v3.html` — open it in a browser before building any new UI in this style; it's the ground truth, this document explains the reasoning.

## The direction

Interacting with an AI is framed as operating a field-expedition radio: not a chat app, no message bubbles, no avatar circles, no floating pill input bar. The interface is a physical instrument — a brass-hardware console with a paper ledger transcript — used in daylight, not a dark terminal.

This is the daylight variant of an earlier dark "shortwave console" concept (CRT phosphor screen, gunmetal panel). Same instrument, same layout logic, recast in brass/canvas/parchment instead of a straight dark-to-light color inversion.

## Principles

- **Instrument, not chat app.** Every element should read as part of a physical console: bezeled panels, brass hardware, a nameplate, a paper transcript — not cards-and-bubbles.
- **One button language, many accents.** All interactive controls share identical shape, radius, blur, and animation. The only thing that changes between a primary/secondary/caution/disabled control is a single `--accent` color variable. Never give one button a fundamentally different shape or effect than another — that break was explicitly corrected once already (v1 had four different button styles; v2/v3 unified them).
- **Vivid, translucent, animated controls.** Buttons are glass chips: `color-mix()` translucency over blur, saturated accent hues, a slow ambient "breathing" glow, and a light-sweep animation on hover. Flat opaque buttons or unanimated buttons are a regression from the accepted style.
- **Paper, not glass, for content surfaces.** The transcript/log area is ruled ledger paper (repeating horizontal lines, ink-brown text), not a card or a chat bubble stream.
- **Brass hardware as structure.** Panel borders, corner rivets, and dividers use the brass palette — this is the visual signature that ties every surface back to "instrument," the same job the gunmetal bezel did in the dark variant.

## Do

- Use `--font-display` (Oswald, uppercase, letter-spaced) for headings, labels, and button text.
- Use `--font-mono` (Share Tech Mono) for transcript/log/body content.
- Keep every button on `--radius-btn` (10px) with the shared `.btn` base — shape identical across all controls.
- Use the vivid accent set (`--poppy`, `--teal-vivid`, `--marigold`) only on interactive controls, not on body text or large surfaces.
- Give every enabled control the breathing-glow + hover-sweep animation; only the disabled state drops animation.

## Don't

- Don't reintroduce message bubbles, avatar circles, or a floating rounded-pill input — that's the generic chat-app look this style exists to avoid.
- Don't give different buttons different shapes, radii, or animation treatments. If a new action needs a new meaning, add a new accent color, not a new button style.
- Don't use flat/opaque button fills — the translucency (`color-mix` over blur) is load-bearing for the "glass instrument panel" read.
- Don't default back to a generic blue/purple/teal SaaS palette, Inter/system-ui font, or soft drop-shadow cards if this style is extended to new screens — see `.claude/rules/write-properly.md`'s sibling anti-pattern logic; the same discipline applies to UI, not just text.

## Extending this style

New screens/components in this style should:
1. Load `tokens.css`.
2. Reuse `.btn` + a new `--accent` value rather than inventing a new button class.
3. Keep new content surfaces on the parchment/paper treatment, not a card-with-shadow pattern.
