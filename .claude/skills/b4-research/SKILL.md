---
name: b4-research
description: Research a topic on the web and add a cited note to the Obsidian vault at C:\Users\rsant\desar\Local Vault\Local Vault. Use when the user asks to research a topic, "look into X", or add sourced/cited notes to the vault.
---

# b4-research

Research a topic on the web, then write a cited Markdown note into the Obsidian vault, asking the user to confirm the save location before writing.

Requires the `smart-connections` MCP server (see the `install-smart-connection` skill if `mcp__smart-connections__*` tools are unavailable).

## Steps

1. Take the research topic/question from the user's request.

2. Check the vault for related existing notes before researching. Call `mcp__smart-connections__lookup` with the topic as the query. If it returns close matches, surface them to the user — the note may belong in or alongside one of them rather than as a fresh topic.

3. Research the topic using `WebSearch` / `WebFetch`. Prefer authoritative and primary sources over blogs/aggregators. Gather enough distinct sources to support multiple citations — don't rely on a single source for the whole note.

4. Draft the note body in Markdown, citing in **APA 7th edition** style:
   - In-text parenthetical citations at the point of use: `(Author, Year)`.
   - A matching numbered footnote at first use of each source: `[^1]`.
   - A `## References` section at the end with full APA 7 entries, one per footnote, e.g.:
     ```
     [^1]: Author, A. A. (Year). *Title of work*. Publisher. https://example.com
     ```
   - Worked example:
     ```markdown
     Constitutional AI trains models using AI-generated feedback instead of
     human labels for harmlessness (Bai et al., 2022).[^1]

     ## References

     [^1]: Bai, Y., Kadavath, S., Kundu, S., et al. (2022). *Constitutional AI:
     Harmlessness from AI feedback*. Anthropic. https://arxiv.org/abs/2212.08073
     ```

5. Before writing anything, ask the user where to save the note — do not assume a default. The vault uses a nested topic hierarchy:
   - `<Topic>/<Subtopic>` — e.g. `AI/Claude` for Claude-specific notes, `AI/Claude/Skills` for notes about skills in general.
   - `<Topic>/<Subtopic>/<Specific note or data>` — e.g. `AI/Claude/Skills/<skill-name>` for a specific skill's description, instructions, and code.

   Suggest a path following this pattern, based on the topic and any related notes found in step 2, but let the user confirm or override it.

6. **Never silently overwrite an existing note.** Before writing, check whether a file already exists at the confirmed path. If it does, ask the user to pick one of:
   - **Append** — add the new research as a new section at the end of the existing note, preserving all existing content.
   - **Merge** — weave the new material into the existing note's structure (e.g. combining reference lists, folding new points into existing sections), preserving all existing content and citations.
   - **New note** — leave the existing note untouched and save the new research as a sibling note with a numeric suffix: `<Name>-01.md` (incrementing to `-02`, `-03`, etc. if those already exist too).

   If no file exists at the confirmed path, just write it as a new note.

7. Write the note to the vault (`C:\Users\rsant\desar\Local Vault\Local Vault\<confirmed path>.md`), following the write mode chosen in step 6.

8. Report the final file path, which write mode was used, and a short summary of what was added.
