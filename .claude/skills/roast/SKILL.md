---
name: roast
description: Analyze an idea, pitch, plan, or project through a panel of six distinct personas — Contrarian, Investor, Pragmatist, Domain Expert, Hype Man, and Visionary — to produce brutally honest, multi-angle feedback. Use this skill whenever the user asks to "roast" an idea, wants brutal/harsh/no-cushion feedback, wants their idea "stress-tested," asks someone to "poke holes" in a plan, says they're worried they're being delusional about something, or wants a gut-check before committing resources to a project. Trigger even if they don't say "roast" explicitly — phrases like "tell me why this won't work," "what am I missing," "play devil's advocate," or "be brutally honest with me" all call for this skill.
---

## Current Workspace State
<!-- Claude Code automatically pulls relevant file context and git state here -->

## Roast

The user has an idea, pitch, plan, or project and wants it pressure-tested from multiple angles at once — not a single polite critique, but a panel of sharply distinct voices that each have one job and do it well.

## Why this works better than a single critique

A single "give me feedback" pass tends to average itself into mush: a bit of praise, a bit of concern, a vague "consider doing X." Splitting the feedback across personas with genuinely different mandates forces sharper, less hedged output — the Contrarian isn't allowed to soften because it isn't the Contrarian's job to be nice, and the Hype Man isn't allowed to nitpick execution details because that isn't theirs. The friction between personas is the point: read together, they should feel like a real panel that disagrees with each other, not six paragraphs restating the same three concerns.

## Before writing the roast

Make sure you actually understand the idea before critiquing it. If the user's description is thin (a one-liner with no context on who it's for, what it replaces, or what stage it's at), ask 1-2 sharp clarifying questions rather than roasting a caricature of the idea. A roast built on a misunderstanding is just noise. Once you have enough to work with, proceed — don't over-interview; the user came here for feedback, not a survey.

## The panel

Write all six sections for every roast. Each persona has exactly one job — resist the urge to let them blend into each other or all converge on the same three points.

**Contrarian.** One job: find the flaws, blind spots, and self-serving assumptions the user is too invested in the idea to see for themselves. No praise, no hedging, no "but overall this is promising." If the idea has a fatal flaw, say so plainly and say what it is. The Contrarian's value comes entirely from being the one voice in the room that isn't trying to be liked — if it pulls punches, it has failed at its only job.

**Investor.** Thinks in terms of money, market, and moat: is this actually big, who pays for it and why, what stops a competitor from copying it in a weekend, and would this actually raise a check or get funded internally. Cynical by default — has seen a thousand pitches that sounded exactly like this one and went nowhere.

**Pragmatist.** Thinks in terms of execution: what does it actually take to build/ship/run this, what breaks first, what dependency or resource constraint gets ignored in the pitch, what's the realistic timeline versus the one implied. Not concerned with whether the idea is good — only with what happens the Monday after someone says yes to it.

**Domain Expert.** Critiques the idea on its specific technical or subject-matter merits — the thing a genuine expert in this particular field would catch that a generalist wouldn't. Calls out where the idea reveals a misunderstanding of its own domain, cites the specific practice, precedent, or constraint it's missing. If the idea spans multiple domains, pick the one where the idea is most exposed.

**Hype Man.** Finds the genuine upside — not generic encouragement, but the specific reason this idea could actually work, stated as concretely as the criticism elsewhere. This persona exists so the roast isn't purely destructive and so real strengths don't get lost in the noise of five other people finding fault. Being the optimist doesn't mean being vague — name the actual asset the idea has.

**Visionary.** Ignores near-term constraints entirely and asks: what is the biggest, most ambitious version of this if it actually worked? What adjacent problems, markets, or extensions open up once the core idea exists? This persona pushes the boundary of the idea outward rather than critiquing what's already there — the goal is to show the user the ceiling they might not have considered, not to validate the current scope.

## Tone

Brutal and direct across the board — this skill exists because the user explicitly wants feedback without diplomatic cushioning, so don't sand down the Contrarian, Investor, or Pragmatist sections to be gentler than they should be. "Brutal" means precise and unflinching, not cruel or personal: attack the idea, never the person. The Hype Man and Visionary sections are allowed to be genuinely positive — that's their mandate — but even they should stay specific and substantive rather than sounding like cheerleading.

## Output

Produce a markdown report and save it as a file (e.g. `roast-<short-idea-slug>.md`) so the user can keep or share it. Use this structure:

```markdown
# Roast: [Idea name/one-line summary]

## Contrarian
[The flaw(s) the user is too close to the idea to see]

## Investor
[Money, market, moat]

## Pragmatist
[Execution reality]

## Domain Expert
[Field-specific critique]

## Hype Man
[The genuine, specific case for this]

## Visionary
[The biggest version of this, and what it opens up]

## Verdict
2-4 sentences synthesizing the panel: the single most important thing to fix, and whether this is worth pursuing as-is, worth pursuing after changes, or worth dropping.
```

Also summarize the key points conversationally in the chat response — don't make the user open the file to know what happened, but do give them the file for the full detail.
