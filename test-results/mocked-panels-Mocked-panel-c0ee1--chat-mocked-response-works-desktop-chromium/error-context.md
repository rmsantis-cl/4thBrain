# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mocked-panels.spec.js >> Mocked panel functionality >> llama chat mocked response works
- Location: tests\ui\mocked-panels.spec.js:27:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - complementary [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]: B4
      - text: 4thBrain
    - navigation [ref=e5]:
      - button "📎 Add file" [ref=e6] [cursor=pointer]:
        - generic [ref=e7]: 📎
        - text: Add file
      - button "Aa Add text" [ref=e8] [cursor=pointer]:
        - generic [ref=e9]: Aa
        - text: Add text
      - button "🔗 Add url" [ref=e10] [cursor=pointer]:
        - generic [ref=e11]: 🔗
        - text: Add url
      - button "▤ Ingest status" [ref=e12] [cursor=pointer]:
        - generic [ref=e13]: ▤
        - text: Ingest status
      - button "◎ Chat with Llama" [ref=e14] [cursor=pointer]:
        - generic [ref=e15]: ◎
        - text: Chat with Llama
      - button "✳ Chat with Claude" [ref=e16] [cursor=pointer]:
        - generic [ref=e17]: ✳
        - text: Chat with Claude
      - link "⚙ Admin" [ref=e18] [cursor=pointer]:
        - /url: /admin
        - generic [ref=e19]: ⚙
        - text: Admin
    - generic [ref=e20]: Recent
    - generic [ref=e21]:
      - generic [ref=e22]: Q3 planning notes.md
      - generic [ref=e24]: "Clipped: obsidian.md local-rest-api"
      - generic [ref=e26]: Meeting-transcript-08-25.pdf
      - generic [ref=e28]: vendor-contract-scan.pdf
    - generic [ref=e30]:
      - generic [ref=e31]: RS
      - generic [ref=e32]:
        - generic [ref=e33]: Ren
        - generic [ref=e34]: Local · Ollama
  - main [ref=e36]:
    - generic [ref=e37]:
      - heading "Chat with Llama mocked — Story 6.5" [level=1] [ref=e38]:
        - text: Chat with Llama
        - generic [ref=e39]: mocked — Story 6.5
      - paragraph [ref=e40]: Scripted replies for now — Story 6.5 wires this to Ollama for real.
      - generic [ref=e43]:
        - textbox "Ask something…" [active] [ref=e44]: test message
        - button "Send" [ref=e45] [cursor=pointer]
```