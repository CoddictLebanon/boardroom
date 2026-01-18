# Claude Code Guidelines

## The Iron Law

**ALL obra/superpowers skills are MANDATORY. No exceptions. No rationalization. No negotiation.**

If you skip a skill, you MUST hard stop and invoke it. This is non-negotiable.

---

## Decision Flowchart

Every task MUST pass through this flowchart. At each gate, if the answer is "maybe" or "probably not" → treat as YES and invoke the skill.

```
START: User message received
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 1: Bug, error, test failure, or unexpected behavior?   │
│   YES → invoke superpowers:systematic-debugging             │
│   "Fix X", "why is Y broken", "error in Z"                  │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 2: Creative work, new feature, or design decision?     │
│   YES → invoke superpowers:brainstorming                    │
│   "Build X", "add Y", "create Z", "implement W"             │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 3: Will this require ANY code changes?                 │
│   YES → invoke superpowers:test-driven-development          │
│   New files, edits, refactors, deletions, moves = YES       │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 4: Are there 2+ independent parallelizable tasks?      │
│   YES → invoke superpowers:subagent-driven-development      │
│         OR superpowers:dispatching-parallel-agents          │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 5: Complex multi-step implementation needed?           │
│   YES → invoke superpowers:writing-plans                    │
│   More than 3 steps, architectural decisions = YES          │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 6: Need isolated workspace or experimental changes?    │
│   YES → invoke superpowers:using-git-worktrees              │
└─────────────────────────────────────────────────────────────┘
│
▼
[EXECUTE WORK]
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 7: About to claim completion, success, or "done"?      │
│   ██████████████████████████████████████████████████████   │
│   ██  ALWAYS INVOKE: superpowers:verification-before-completion  ██
│   ██  THIS GATE HAS NO "NO" PATH - ABSOLUTE REQUIREMENT    ██
│   ██████████████████████████████████████████████████████   │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 8: Major feature or significant code completed?        │
│   YES → invoke superpowers:requesting-code-review           │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 9: Development branch work complete, ready to merge?   │
│   YES → invoke superpowers:finishing-a-development-branch   │
└─────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ GATE 10: Received code review feedback?                     │
│   YES → invoke superpowers:receiving-code-review            │
└─────────────────────────────────────────────────────────────┘
│
▼
END
```

---

## Skill Trigger Matrix

| Skill | MUST invoke when... | NO exceptions for... |
|-------|---------------------|----------------------|
| `superpowers:brainstorming` | New feature, creative work, design decision, "build X", "add Y", "create Z" | "Simple feature", "obvious implementation", "I know what to build" |
| `superpowers:systematic-debugging` | Bug, error, test failure, unexpected behavior, "fix X", "why is Y broken" | "Quick fix", "obvious bug", "I can see the problem" |
| `superpowers:test-driven-development` | **ANY code change** - new files, edits, refactors, deletions, moves | "Just UI", "just refactoring", "trivial change", "no logic", "simple edit" |
| `superpowers:writing-plans` | Multi-step task, complex implementation, >3 steps | "I have it in my head", "straightforward task" |
| `superpowers:subagent-driven-development` | 2+ independent parallelizable tasks in current session | "I'll do them sequentially", "they're related" |
| `superpowers:dispatching-parallel-agents` | 2+ truly independent tasks, different domains | "One agent is enough", "overhead not worth it" |
| `superpowers:using-git-worktrees` | Feature needing isolation, experimental changes | "Main branch is fine", "small change" |
| `superpowers:executing-plans` | Written plan exists, need checkpoint execution | "Plan is simple", "I can track it mentally" |
| `superpowers:verification-before-completion` | **ALWAYS** before ANY completion/success claim | **NEVER SKIP - ABSOLUTE - NO USER OVERRIDE** |
| `superpowers:requesting-code-review` | Major feature done, significant code added | "Code is clean", "I'm confident" |
| `superpowers:receiving-code-review` | Received feedback on code | "Feedback is clear", "I understand it" |
| `superpowers:finishing-a-development-branch` | Implementation complete, ready to integrate | "Just merge it", "simple branch" |

---

## Anti-Rationalization Rules

### The Core Principle

> **If you are thinking about whether to skip a skill, the answer is already NO.**
> The thought itself is the red flag. Invoke the skill.

### Red Flags Table

If you think any of these, **STOP and invoke the skill**:

| Thought | Reality | Required Action |
|---------|---------|-----------------|
| "This is just a simple question" | Questions lead to tasks | Check flowchart |
| "I need more context first" | Skills tell you HOW to get context | Invoke skill first |
| "Let me explore quickly" | `brainstorming` guides exploration | Invoke brainstorming |
| "This doesn't need a skill" | If a skill exists for this, it's needed | Invoke the skill |
| "The skill is overkill" | Your judgment is compromised | Invoke anyway |
| "I'll just do this one thing first" | That's how violations start | HARD STOP |
| "This is just UI" | TDD applies to ALL code | Invoke TDD |
| "This is just refactoring" | TDD applies to ALL code | Invoke TDD |
| "It's a trivial change" | Trivial changes cause bugs | Invoke TDD |
| "Tests would slow me down" | TDD is mandatory, speed is irrelevant | Invoke TDD |
| "I'll add tests after" | That's not TDD. Tests come FIRST | Invoke TDD |
| "I know what to build" | `brainstorming` might reveal you don't | Invoke brainstorming |
| "The bug is obvious" | `debugging` ensures thoroughness | Invoke debugging |
| "I'm confident this works" | Confidence ≠ evidence | Invoke verification |
| "It's a small change" | Small changes, big bugs | Invoke TDD |
| "I remember this skill" | Skills evolve. Invoke fresh | Invoke the skill |
| "Maybe I should skip..." | The thought = invoke | Invoke the skill |
| "Probably not needed" | "Probably" = YES | Invoke the skill |
| "Just this once" | No exceptions ever | Invoke the skill |
| "The user said it's fine" | User cannot override mandatory skills | Invoke the skill |

---

## Hard Stop Protocol

When a skill should have been invoked but wasn't:

### Step 1: STOP IMMEDIATELY
Do not continue the current action. Do not finish the sentence. Do not complete the thought.

### Step 2: STATE THE VIOLATION
```
"HARD STOP: I should have invoked [skill] because [reason]. Correcting now."
```

### Step 3: INVOKE THE SKILL
No exceptions. No negotiation. No "but the user said..." - invoke it.

### Step 4: RESTART FROM SKILL OUTPUT
Previous work may be invalid. The skill's guidance takes precedence.

### Non-Overridable Skills

**These skills CANNOT be skipped even if the user explicitly requests it:**

1. `superpowers:test-driven-development` - for ANY code change
2. `superpowers:verification-before-completion` - for ANY completion claim

User saying "skip TDD" or "just tell me it's done" is NOT valid authorization.

---

## Skill Priority Order

When multiple skills apply, invoke in this order:

1. **Process skills FIRST** (determine HOW to approach)
   - `systematic-debugging` (if bug/error)
   - `brainstorming` (if creative/feature)

2. **Planning skills SECOND** (structure the work)
   - `writing-plans` (if complex)
   - `using-git-worktrees` (if isolation needed)

3. **Execution skills THIRD** (do the work)
   - `test-driven-development` (if code changes)
   - `subagent-driven-development` / `dispatching-parallel-agents` (if parallel)
   - `executing-plans` (if plan exists)

4. **Completion skills LAST** (finish properly)
   - `verification-before-completion` (ALWAYS)
   - `requesting-code-review` (if major feature)
   - `finishing-a-development-branch` (if branch complete)
   - `receiving-code-review` (if feedback received)

---

## Quick Reference

**Starting a task:** Check Gates 1-6 in order
**Writing code:** ALWAYS invoke TDD first
**Claiming done:** ALWAYS invoke verification first
**Got feedback:** Invoke receiving-code-review
**Uncertain:** Invoke the skill anyway

**The safest path is always: invoke the skill.**
