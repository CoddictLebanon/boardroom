# CLAUDE.md Optimization Design

**Date:** 2026-01-18
**Status:** Approved

## Overview

Redesign CLAUDE.md to enforce mandatory usage of ALL obra/superpowers skills with zero exceptions, using a decision flowchart approach with hard stop enforcement.

## Requirements

1. **All obra/superpowers skills mandatory** - Every skill must be explicitly considered
2. **Decision flowchart routing** - If-then logic routes tasks to required skills
3. **Hard stop on violation** - Cannot proceed if skill is skipped
4. **Anti-rationalization** - Preemptively block every known excuse

## Design

### Structure

1. The Iron Law (non-negotiable statement)
2. Decision Flowchart (visual + text)
3. Skill Trigger Matrix (when each skill MUST fire)
4. Anti-Rationalization Rules
5. Hard Stop Protocol

### Decision Flowchart

```
START → GATE 1 (bug?) → systematic-debugging
      → GATE 2 (creative?) → brainstorming
      → GATE 3 (code changes?) → test-driven-development
      → GATE 4 (2+ tasks?) → subagent/parallel-agents
      → GATE 5 (plan needed?) → writing-plans
      → GATE 6 (isolation needed?) → using-git-worktrees
      → [EXECUTE]
      → GATE 7 (completion?) → verification-before-completion [ALWAYS]
      → GATE 8 (major feature?) → requesting-code-review
      → GATE 9 (branch done?) → finishing-a-development-branch
      → END
```

**Key rule:** "Maybe" or "probably not" = YES, invoke the skill.

### Skill Trigger Matrix

| Skill | Trigger | No exceptions |
|-------|---------|---------------|
| brainstorming | New feature, creative work | "Simple", "obvious" |
| systematic-debugging | Bug, error, failure | "Quick fix", "obvious" |
| test-driven-development | ANY code change | "UI only", "refactor" |
| writing-plans | Multi-step, complex | "In my head" |
| subagent-driven-development | 2+ parallel tasks | "Sequential is fine" |
| verification-before-completion | ALWAYS | **ABSOLUTE** |
| requesting-code-review | Major feature done | "Code is clean" |
| finishing-a-development-branch | Branch complete | "Just merge" |

### Hard Stop Protocol

1. STOP immediately
2. State the violation
3. Invoke the skill
4. Restart from skill output

User override NOT VALID for TDD and verification.
