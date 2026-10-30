---
name: explain
description: Explain recent code changes or a named file, feature, or concept to a learner in Arabic, then check understanding with one question.
disable-model-invocation: true
---

# Explain

The user is learning this stack (FastAPI, SQLAlchemy, Alembic, Celery, Redis, React, TypeScript, Docker) through this project. He knows Python and MySQL. His goal is to understand every part of his code well enough to explain it in an interview.

## What to explain

- If the user named a file, feature, function, or concept after the command, explain that.
- Otherwise, explain the most recent changes: run `git status` and `git diff` (and `git diff --staged`) and focus on what was just written.
- If the change is large, explain it file by file in the order a request flows: router → schema → service → model, or page → component → API call.

## How to explain

Write in Arabic (Saudi dialect is fine). Keep code, file names, and technical terms in English. Start every line or bullet with an Arabic word so right-to-left text stays aligned.

For each part, cover:

1. **وش يسوي:** what this code does, in one or two sentences.
2. **ليش انكتب كذا:** why it is written this way, and which rule in `CLAUDE.md` or requirement in `SPEC.md` it serves. Mention a simpler alternative if one exists and why it was not used.
3. **كيف يرتبط:** how it connects to the other layers (what calls it, what it calls).
4. **مفهوم جديد:** one concept worth learning from this code (for example: dependency injection, ORM relationships, migrations, async tasks, React state, props, hooks). Explain it with a short analogy and a tiny example.

Rules:
- Explain only what is in the code. Do not invent behavior.
- Prefer short real snippets from the file over long pastes.
- Do not change any code while explaining.

## Check understanding

End with exactly one question that tests understanding (not memory), for example "what would happen if…" or "where would you change X if…".

Wait for the answer. Then say what was right, correct what was wrong in a sentence or two, and stop. Do not ask a second question unless the user asks for more.
