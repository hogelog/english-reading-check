# Daily English Reading Check

A 5-minute daily reading check to track your English progress over time.

Read a passage (300–500 words) → answer 5 questions → compare with past results.

🌐 https://hogelog.github.io/english-reading-check/

Zero dependencies, no backend, no tracking. History lives in the browser's LocalStorage only. PWA-ready, works offline. 37 passages included (A1×7 / A2×7 / B1×8 / B2×8 / C1×7).

## Dev

```bash
npm run dev      # Vite dev server with HMR
npm test         # node --test, no test deps
npm run build    # validate data -> Vite build (hashed assets) -> dist/
```

Push to `main` to deploy to GitHub Pages (source: GitHub Actions — enable it in Settings → Pages on first setup).

## Add a passage

Append an object to `public/data/a1.json` / `a2.json` / `b1.json` / `b2.json` / `c1.json` (plain JSON arrays):

```js
{
  "id": "b1-009",              // unique
  "difficulty": "B1",
  "title": "Article Title",
  "text": "para1\n\npara2...", // 300–500 words
  "questions": [               // exactly 5
    {
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "answer": 1,             // index 0–3
      "explanation": "..."
    }
  ]
}
```

`npm run build` validates the data. Mix question types (facts, inference, vocab in context, referents, cause-effect, summary, author intent) — not vocab drills.
