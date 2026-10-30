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

## How to say it (interview prep)

The interview will be in English. After the Arabic explanation, add a short section titled **How to say it** with 2–3 plain English sentences the user could say if an interviewer asked about this code or decision. Use simple, natural spoken English, not documentation style.

## Check understanding

End with exactly one question in English that tests understanding (not memory), for example "What would happen if…?" or "Where would you change X if…?". Ask the user to answer in English.

Wait for the answer. Then:
- Say what was right and correct what was wrong (in Arabic, a sentence or two).
- Give a cleaner English version of the user's answer, keeping their ideas.
Stop there. Do not ask a second question unless the user asks for more.
