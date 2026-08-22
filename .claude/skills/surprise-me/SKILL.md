---
name: surprise-me
description: Design and iterate on an original, deliberately unconventional visual style for a web UI, then lock the accepted result into a reusable style-definition rule for the project. Use when the user asks to create a new UI style/theme "from scratch", wants something totally different from generic AI-generated design, says "surprise me" about a UI's look, or asks to establish a design system for a project.
---

# surprise-me

Propose an original web UI style, show it as a real sample, iterate on feedback, and once accepted, lock it into design tokens and a written rule the project can reuse.

## Steps

1. Confirm the target project (current working directory, or ask if ambiguous). All output goes under `<project>/styles/`.

2. **Pick a deliberately surprising creative seed.** The whole point of this skill is to avoid the generic AI-UI look: Inter/system-ui font, blue-to-purple gradient, rounded cards with a soft drop shadow, centered symmetric hero, teal/indigo accent color. Explicitly rule those out as a starting point.

   Draw the seed from a genuinely different design reference — pick one unexpected combination of movement/era, typography, and color mood rather than a generic "modern clean" brief. Examples of directions to pull from (not exhaustive, invent your own too): Swiss/International Typographic style, Brutalism, Memphis Group, Bauhaus, Constructivism, Art Deco, Y2K/vaporwave, 90s print zine, ukiyo-e-influenced, technical/schematic (blueprint, oscilloscope), biomorphic/organic, high-contrast editorial.

   State the chosen direction and *why* it's a deliberate departure in one or two sentences before generating anything, so the user knows what they're about to look at.

3. **Generate a sample.** Build a single self-contained HTML file (inline `<style>`, no build step, no required CDN/font dependency beyond an optional linked Google Font) demonstrating the style across representative UI pieces: type scale (headings + body), color palette swatches, buttons (primary/secondary/disabled), a form input, a nav bar, a card, and one small realistic content layout combining several of these.

   Save as `<project>/styles/<style-slug>/sample-v1.html`. Tell the user the exact path to open in a browser.

4. **Ask for a reaction.** Give the user three explicit options: accept as-is, request specific changes, or reject the whole direction. Don't assume silence or a mild comment means acceptance — get an explicit answer.

5. **Iterate:**
   - **Specific corrections/suggestions** → apply them, save as `sample-v<N+1>.html` (increment, never overwrite — keep the iteration history inspectable), ask again.
   - **Rejected outright** → pick a genuinely different creative seed (not a variation of the last one) and restart at step 3 under a new slug, e.g. `styles/<style-slug>-2/sample-v1.html`.
   - **Accepted** → proceed to step 6, but confirm explicitly first ("lock this in as the final style?") before finalizing — a positive reaction to a sample isn't automatically a sign-off.

6. **Finalize the accepted style.** From the accepted sample, produce:
   - `<project>/styles/<style-slug>/tokens.css` — CSS custom properties for the full palette, type scale, spacing scale, radii, shadows, and motion durations/easings actually used in the accepted sample.
   - `<project>/styles/<style-slug>/RULE.md` — the style's name and creative direction, the principles/do's and don'ts that make it distinctive, explicit anti-patterns to avoid (drifting back toward the generic defaults ruled out in step 2), and a pointer to `tokens.css` and the accepted sample file as canonical references.

7. **Wire it into the project.** Add a line to the project's `CLAUDE.md` (or a directory-scoped `CLAUDE.md` if the project already uses that pattern) pointing at `styles/<style-slug>/RULE.md`, so future UI work in that project picks it up automatically. Don't overwrite unrelated content in that file — append/insert alongside existing rule references.

8. Report the final artifact paths and a short description of the locked-in style.

## Notes

- Keep every sample self-contained and framework-agnostic (plain HTML/CSS) — implementing the accepted style in a specific production stack (React, Vue, etc.) is a separate, later task, not this skill's job.
- Preserve iteration history (versioned files, new slug on full rejection) rather than overwriting, so earlier rounds stay inspectable if the user wants to backtrack.
- The anti-pattern list in step 2 exists because LLMs converge on the same handful of "safe" UI looks by default — actively fight that pull throughout, not just in the first sample.
- Reference example in this project: `styles/shortwave-console/` (the "Field Radio Logbook" style) shows the full flow — three iterations, then `tokens.css` + `RULE.md`, wired into `CLAUDE.md`.
