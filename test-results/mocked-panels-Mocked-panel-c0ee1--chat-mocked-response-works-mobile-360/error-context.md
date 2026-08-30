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
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - button "Toggle menu" [ref=e3] [cursor=pointer]: ☰
    - generic [ref=e4]:
      - generic [ref=e5]: B4
      - text: 4thBrain
  - complementary [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]: B4
      - text: 4thBrain
    - navigation [ref=e9]:
      - button "📎 Add file" [ref=e10] [cursor=pointer]:
        - generic [ref=e11]: 📎
        - text: Add file
      - button "Aa Add text" [ref=e12] [cursor=pointer]:
        - generic [ref=e13]: Aa
        - text: Add text
      - button "🔗 Add url" [ref=e14] [cursor=pointer]:
        - generic [ref=e15]: 🔗
        - text: Add url
      - button "▤ Ingest status" [ref=e16] [cursor=pointer]:
        - generic [ref=e17]: ▤
        - text: Ingest status
      - button "◎ Chat with Llama" [ref=e18] [cursor=pointer]:
        - generic [ref=e19]: ◎
        - text: Chat with Llama
      - button "✳ Chat with Claude" [ref=e20] [cursor=pointer]:
        - generic [ref=e21]: ✳
        - text: Chat with Claude
      - link "⚙ Admin" [ref=e22] [cursor=pointer]:
        - /url: /admin
        - generic [ref=e23]: ⚙
        - text: Admin
    - generic [ref=e24]: Recent
    - generic [ref=e25]:
      - generic [ref=e26]: Q3 planning notes.md
      - generic [ref=e28]: "Clipped: obsidian.md local-rest-api"
      - generic [ref=e30]: Meeting-transcript-08-25.pdf
      - generic [ref=e32]: vendor-contract-scan.pdf
    - generic [ref=e34]:
      - generic [ref=e35]: RS
      - generic [ref=e36]:
        - generic [ref=e37]: Ren
        - generic [ref=e38]: Local · Ollama
  - main [ref=e40]:
    - generic [ref=e41]:
      - heading "Add file" [level=1] [ref=e42]
      - paragraph [ref=e43]: Drop a file or browse.
      - generic [ref=e44]:
        - generic [ref=e45] [cursor=pointer]: Drag a file here, or click to browse
        - textbox "Tags (comma-separated)" [ref=e46]
```