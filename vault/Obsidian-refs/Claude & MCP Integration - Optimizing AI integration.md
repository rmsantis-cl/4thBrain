---
title: "Claude & MCP Integration - Optimizing AI integration"
source: "https://www.reddit.com/r/ObsidianMD/comments/1kln9w9/claude_mcp_integration_optimizing_ai_integration/?solution=9de489f65494a7059de489f65494a705&js_challenge=1&token=7afd7253fec22262ff1c52b1703fe9ec7597bd7f3a7c5f2841c5c8cd8623e62f&jsc_orig_r=&share_id=0I8f9ZKYF7h0JQuFesEwc&utm_content=2&utm_medium=android_app&utm_name=androidcss&utm_source=share&utm_term=2"
author:
  - "[[septic_sergeant]]"
published: 2025-05-13
created: 2026-08-25
description: "Hey all, Just recently made the move to obsidian. Largely because I wanted to embed AI into my notes. Claude client + MCP is seem"
tags:
  - "clippings"
---
Hey all,

Just recently made the move to obsidian. Largely because I wanted to embed AI into my notes. Claude client + MCP is seemingly everything I was looking for.

For those of you who have gone down this road do you have any tips (or examples) for/of system/processing/tagging instructions that you house via note and instruct AI to reference? I’d really like to be able to leverage Claude to process notes and generally clean up the vault. In some though, it’s proving challenging to get it to do it in accordance to my vault “rules” with accuracy:

Anyone willing to share out some examples of their own instructions or provide some tips?

Read more

---

## Comments

> **howiew0wy** · [2025-05-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/ms5wch3/) · 4 points
> 
> Claude with MCP is the goat.
> 
> Filesystem works fine but [obsidian-mcp-tools](https://github.com/jacksteamdev/obsidian-mcp-tools) hooks into the local REST API for standard vault interaction. Plus it connects to the Smart Connections plugin for semantic search across your vault.
> 
> > **septic\_sergeant** · [2025-05-15](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/msi7onf/) · 1 points
> > 
> > Interesting. I’m new to this so apologize for the potentially dumb questions. What does this give me that the standard anthropic MCP server doesn’t? I very likely am misunderstand but I can do semantic search without Smart Connections already?
> > 
> > > **howiew0wy** · [2025-05-15](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/msi95tm/) · 1 points
> > > 
> > > Which standard anthropic server? If filesystem, that search tool just searches file and directory names against the search pattern.
> > > 
> > > Semantic search analyzes the content of the files using vector embeddings that capture the meaning of the query and files. It can find conceptually related content even if the words don’t match.
> 
> > **scipio42** · [2025-07-04](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/n181xcd/) · 1 points
> > 
> > Could I replace my memory mcp with this? Right now, memory is working as a knowledge graph, but this seems possibly superior due to the ability for me to more easily edit and refine the entities.
> > 
> > > **howiew0wy** · [2025-07-04](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/n1899h0/) · 1 points
> > > 
> > > Yeah I’ve seen people doing that!
> 
> > **esstisch** · [2026-03-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/oa7lquu/) · 1 points
> > 
> > WOA !! :D i ll give it a try
> > 
> > **esstisch** · [2026-03-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/oa7sxun/) · 1 points
> > 
> > WOA INSANE!!!! Thanks!!

> **kpetrovsky** · [2025-05-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/ms4yup5/) · 1 points
> 
> Set up a comprehensive flow for this, filling it out with data right now. Will post prompts in a few hours when I get to my computer, but main tip: Go with the general filesystem MCP!
> 
> > **septic\_sergeant** · [2025-05-15](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/msi6n2x/) · 2 points
> > 
> > Definitely let me know what your prompts/system instructions look like. I would love to see it.
> > 
> > I’ve tried every AI plugin, and I totally agree. Claude + MCP + file system access blows away anything else available. I’ll be using co-pilot + local models where data sensitivity is concerned and to limit cloud usage costs, but otherwise the Claude set up is phenomenal.
> > 
> > Really looking to create some pretty robust system instructions and prompts for allowing incoming note processing and vault refactoring. It was working well initially, but as I imported more notes from Evernote, I started to see some problems at scale. I think it’s definitely feasible to get it to do what I want, but prompts/instructions/org structure are going to take some thought and effort

> **blaidd31204** · [2025-05-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/ms4319e/) · 1 points
> 
> Following!

> **michaericalribo** · [2025-05-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/ms4qgot/) · 1 points
> 
> I can’t recommend the Smart Composer plugin enough, it’s a chat interface with edit capabilities and access to all the models you could want…it’s neat to have the feature inside obsidian rather than using an external editor (though I still do use vscode for my notes sometimes)
> 
> > **zxc223** · [2025-05-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/ms6mdl9/) · 1 points
> > 
> > Have you used the Copilot plugin? These two look like two of the top choices and I've been meaning to get started.
> > 
> > > **michaericalribo** · [2025-05-14](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/ms6prur/) · 1 points
> > > 
> > > I tried copilot at first but I was turned off by the paid model…Smart Connector is free and has the features I need, chat and the ability to apply edits and review and approve the diffs / changes. It matches the interface I’m used to in vscode copilot and fits into obsidian well. I use it mostly for writing technical docs, learning technical topics, and solving computing problems (coding, systems administrations). All of those lend themselves to operating out of docs/notes

> **Hi\_Im\_Nosferatu** · [2025-05-13](https://reddit.com/r/ObsidianMD/comments/1kln9w9/comment/ms4erth/) · 1 points
> 
> Not totally sure how to get Claude into Obsidian without paying the API fees.
> 
> But I use Claude through Cursor AI, and I just open the entire Vault as a folder. Then you can choose to give Claude full agent access to the vault, or just read-only access.