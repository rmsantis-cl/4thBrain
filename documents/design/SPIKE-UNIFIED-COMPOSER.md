---
name: SPIKE-UNIFIED-COMPOSER
description: Spike brief for collapsing the file, text, URL and chat panels into one composer screen, and for deciding how a single input tells capture from conversation
metadata:
  version: 1.0
  created-by: Claude Opus 5
  date: 2026-09-07
  story: P1.17
---

# Spike — one composer for files, text, URLs and chat

Brief for Story P1.17. The UI today has six panels behind a nav (`index.html:366-433`): Add File,
Add Text, Add URL, Search, Ingest Status, Chat with Llama. Three of those six are the same act —
put something into the vault — split across three forms because the transport differs. The user has
to pick the panel before knowing that the panel was a question at all.

The proposal is one screen: a text area, a row of buttons, and a `[+]` that attaches a file. Typing
something that parses as a URL flips the input into URL mode on its own. Anything else stays text.
Chat with Ollama lives in the same box.

There is a question underneath this that the spike exists to answer, and it is not the URL
detection.

## The real question: capture or converse?

Auto-detection can separate a file from a URL from plain prose, because those differ in form. It
cannot separate *"save this note"* from *"answer this question"*, because both are prose typed into
the same box. Nothing in the characters distinguishes them.

Getting it wrong is not symmetric:

- Chat treated as capture puts junk in the vault, which then gets classified, indexed, and surfaces
  in search results months later. Recoverable, but only by hand.
- Capture treated as chat loses the note. The user typed something they wanted kept and got a
  conversational reply instead.

So the composer needs a disambiguator that is explicit, cheap, and visible before the user commits.
The options below are ordered by how much they ask of the user.

### Option A — a mode toggle

Two states next to the composer, Capture and Ask, with Capture as the default. The send button
relabels itself and the placeholder changes with the mode.

Costs one click when the user wants the non-default. Never guesses. The mode is visible at rest,
so the user can see what will happen before pressing Enter — the property that matters most here.

The risk is a sticky mode: the user asks a question, gets an answer, types a note, and it goes to
Ollama because the toggle stayed on Ask. Whether the mode should snap back to Capture after each
send is a real sub-decision, and the kind of thing only a prototype settles.

### Option B — two send actions on one box

One composer, two buttons: `Add` and `Ask`. Enter binds to the primary, Ctrl+Enter to the other.

No mode to get stuck in and no state to forget, so the sticky-mode failure disappears. The user
chooses at the moment of sending, which is the moment they actually know their intent. Cost is a
denser button row and a keyboard shortcut nobody discovers without being told.

This is the option to beat. It is closest to what was described — "a text area plus a bunch of
buttons" — and it removes a class of bug rather than mitigating it.

### Option C — a sigil

A leading `?` or `/ask` routes to Ollama; anything else is capture.

Fast for a keyboard user and invisible to everyone else. It also collides with real content: a note
that legitimately starts with `?`, or a pasted snippet beginning with `/`. Fine as an accelerator on
top of A or B, insufficient on its own.

### Option D — infer intent from the text

Look for a question mark, an interrogative opening, short length, and route accordingly.

Reject this explicitly rather than leave it hanging, because it will be proposed again. "How does
the Coordinator dispatch messages?" is a note title and a question. A one-line reminder with no
question mark is a note. The heuristic is right most of the time, and its failures are silent and
asymmetric per above. Using an LLM call to decide the routing of an LLM call also consumes a gate
slot the Classifier needs, since Ollama concurrency is 1.

### Option E — unify ingest only, leave chat where it is

Collapse Add File / Add Text / Add URL into one composer. Keep Chat as its own panel.

The honest fallback. It captures most of the simplification with none of the ambiguity, because
every path through the one composer means "put this in the vault". It loses the thing that makes the
single screen appealing — asking about the vault and adding to it happening in the same place — but
it is a real answer if A and B both prototype badly.

The spike builds A and B and compares them against E, rather than assuming the unified box wins.

## URL detection

The behaviour described: typing something with URL syntax turns the URL option on.

The rule needs to be narrow. **Detect only when the entire trimmed input is a single URL.** A note
that quotes a link is a note that happens to contain a URL. A bare `https://…` on its own is an
instruction to go fetch that page. If detection fires on any input containing a link, every note
with a citation becomes a fetch.

Sub-questions the prototype settles:

- **Scheme-less input.** Is `example.com/article` a URL? Accepting it means `Ollama.md` and
  `Notes.txt` parse as hostnames too. Leaning toward requiring `http://` or `https://`, and letting
  the user click the chip to force URL mode for anything else.
- **Override.** The detected mode shows as a chip or a lit button, dismissible in one click, so a
  user who wants to store a URL *as text* can. Detection proposes; it does not decide.
- **Multiple URLs.** Two links, one per line — one document each, or one note? Simplest defensible
  answer: more than one URL is text unless the user says otherwise.
- **When it fires.** On every keystroke is noisy while typing a long note that ends in a link. On
  blur or on paste is calmer. Paste is how URLs mostly arrive, which argues for detecting there.

## Attachments

`[+]` opens the file picker. Two more paths cost almost nothing and are how people actually move
files: drag onto the composer (the existing dropzone already does this at `index.html:370`) and
paste from the clipboard.

Open questions:

- **Text plus a file in one send.** Is the typed text a caption on that document, a set of tags, or
  a second document? Every answer is defensible, and the composer cannot ship without picking one.
  The current per-panel forms sidestep it with a separate tags field.
- **Several files at once.** One document each, or one submission? P1.8 already established that a
  ZIP becomes a child Document per member, which argues for one document per file.
- **Where tags go.** Each panel has its own tags input today. In a single composer, inline `#tag`
  tokens are tempting and carry a trap: `#tag` at the start of a line is a Markdown heading, and the
  vault stores Markdown. A separate small field is uglier and unambiguous.

## The feed below the composer

One screen means the composer needs somewhere to put results, and both kinds of result can share it:
a captured document appears as a receipt carrying its pipeline status, an Ollama answer appears as a
reply. That shared stream is what makes the single screen worth building rather than merely smaller.

The obstacle is that per-document status is not exposed. `/api/status` returns five aggregate counts
and nothing else (`StatusController.java:17-28`), so the UI can say four documents are classifying
but cannot say which, or that *this* document just finished. A receipt that shows a document
advancing needs an endpoint that does not exist. Whether that endpoint is in scope here or belongs
to P1.12 is a scoping call the spike records rather than quietly implements.

Search is the sixth panel and stays where it is. `/api/search` is a stub returning an empty list
(`SearchController.java:11-19`), and folding search in would add a fourth meaning to Enter.

## What the spike cannot demonstrate

Three of the four endpoints behind this screen do not work yet:

| Endpoint | State today |
| :---- | :---- |
| `POST /api/ingest/file` | Works. Saves to `vault.tmp`, creates the Document and a copy row, dispatches to Ingestor |
| `POST /api/ingest/text` | Returns `{"not":"implemented"}` — P1.13 |
| `POST /api/ingest/url` | Returns `{"not":"implemented"}` — P1.13 |
| `POST /api/chat/llama` | Echoes the message back as a stub — needs P2.1 and P2.4 for a real Ollama call |

The spike proves the interaction, not the pipeline. Prototype against stubbed responses, and treat
P1.13 as a dependency of the implementation story rather than of the spike. This is also why the
answer cannot be "just build it": the composer's shape has to be settled before P1.13 fixes those
two endpoints, because what they accept depends on what the composer sends.

## Constraints inherited

- **ADR25.** A served page lives in `src/main/resources/templates/` and its `@Controller` method
  returns the file name without extension. `static/` holds linked assets, not pages.
- **No `th:inline="javascript"`** on any script using template literals. Thymeleaf and JavaScript
  share the `${...}` delimiter, and index.html's inline script survives only because the attribute
  is absent.
- **Self-contained page.** `index.html` is 18 KB of inline CSS and JS with no build step and no
  framework. A proposal that adds a bundler or a front-end framework is a separate decision needing
  its own argument, and this spike is not the place to smuggle it in.

## What the spike must produce

1. **A clickable prototype** of options A and B against stubbed endpoints, with the URL detection
   rule implemented as described. Both, not one — the comparison is the point.
2. **A decision on capture-versus-converse**, in one paragraph, naming the option and what would
   change it.
3. **The URL detection rule written down**, precisely enough to implement: what fires it, when it
   fires, how the user overrides it.
4. **Answers to the composition questions**: text plus file, multiple files, where tags live,
   whether the mode resets after each send.
5. **A statement on per-document status** — whether the feed needs a new endpoint, and if so which
   story owns it.
6. **A screen sketch** of the final layout, including what happens to the nav when six panels become
   three or four.

## Exit criteria

Done when there is a written recommendation backed by the prototype, and:

- the decision is recorded as an ADR in `documents/design/ADRS.md` as **ADR27** (ADR26 is reserved
  by Story P1.11's plan and ADR28 is taken by the P2.8 converter decision, so 27 is this spike's
  slot rather than simply the next free number),
- an implementation story is created for the composer itself, blocked by P1.13,
- and any endpoint gap the spike found is logged in `documents/DESIGN-DEBT.md` or attached to an
  existing story.

Prototype code lives under `spikes/unified-composer/` and is throwaway. It is not wired into
`src/main`, which is what keeps this spike outside the design-before-implementation rule rather than
in violation of it. No production code lands under P1.17.

## Risks

- **The single box collapses under its own generality.** Four intents through one control can end up
  with more chrome than the six panels it replaced. The prototype is what catches this; if option E
  wins, that is a result rather than a failure.
- **Silent misrouting.** Covered above, and the reason option D is rejected up front rather than
  measured.
- **Prototyping against stubs.** The interaction can look right while the real latency of an Ollama
  call and a full pipeline run makes it feel wrong. The feed's behaviour under a slow response has to
  be designed even though it cannot be observed yet.
- **Scope creep into search.** Folding the sixth panel in is tempting once the composer exists. Out
  of scope.

## Timebox

Half a day. This is an interaction decision with a prototype attached, not an evaluation of
libraries. If A and B still look equally good at the halfway point, take B and record that the
choice was close.
