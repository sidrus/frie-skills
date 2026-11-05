---
name: writing-style-guide
description: Prose style for documentation, code comments, XML docs, Javadoc, and docstrings, commit and PR messages, tickets, and chat replies. Use whenever you write, edit, or review prose of any kind, including READMEs, changelogs, docstrings, commit messages, and tickets, even when another skill also covers the task.
---

# Writing Style Guide

## Length

- Add text only when it carries something new, and then use as few words as that information needs.
- State each point once. Cut restatements and examples that repeat an earlier sentence.

## Sentences

- American English spelling: behavior, color, serialize. The plural of index is indices.
- Write flowing grammatical sentences in the active voice. Em-dash asides and colon-chained clauses read as AI-speak, so restructure them into full sentences rather than choppy fragments. Term-definition bullets and tables are fine.
- Keep paragraphs to three or four concise sentences.
- Use literal language. No metaphors, idioms, or other figurative speech.

## Voice

Text written on Brandon's behalf, such as docs, PR descriptions, commit messages, comments, and tickets, reads as his own writing.

- Lead with the decision, then give a short reason, as in "Dropped the GUID. UserIndex is already unique per source."
- Use "we" for the team and the system, and "I" only for Brandon's own preferences.
- Give numbers and verified facts in place of adjectives.
- State scope explicitly, including what is left out.
- In design writing, move from the problem to the principle, then the mechanism, then the benefit.

Finished products such as docs, PR descriptions, and work items are polished, grammatical, and free of typos. PR comments and commit messages can be less formal but still read well.

## Claims

State as fact only what you verified. Where code is (uncommitted, on a branch, merged, deployed) comes from evidence you checked, and impact stays conditional ("once this ships") until deployment is verified.

## Explanations

Explain with the causal chain: what you saw, what it changes, and what you recommend. Leave out what you tried, weighed, or ruled out. A question to the reader carries that chain and a recommendation, so it can be answered from the one message.

## Documentation

- State project-specific facts only. Cut anything most developers already know.
- Write as current state. Removed content is deleted outright, with no "removed" note, no "formerly", and no reference to a superseded plan.
- Keep one source of truth per topic, so a replaced doc is deleted rather than left beside its successor.
- Temporary or one-off docs don't get linked from a docs index.

## Code comments

When a comment is requested, write one terse line. Don't explain how a test works, don't restate the name of the thing being commented, and don't add a second line.

## Before finishing

Reread everything you wrote for British spellings, em-dash or colon-chained sentences, figurative phrases, and points made twice.
