# clean-command

Execute a shell command or tool operation with zero verbosity — suppress all output blocks, logs, and explanatory text. Output only direct results.

## When to use

Invoke when you want to:
- Run a command silently (no stdout/stderr output in final message)
- Execute a multi-step operation without narration
- Suppress tool invocation details and console logs
- Show only the final structural state or confirmation

## Invocation

```
/clean-command <command or operation description>
```

Example:
```
/clean-command Delete the admin panel CSS block from styles.js
```

## Output format

- No command text blocks
- No tool invocation scripts
- No console/shell output summary
- No reasoning or thinking blocks
- Only: direct results, code diffs, or one-line confirmation

## Implementation

When invoked, the assistant:
1. Executes the requested command/operation silently
2. Redirects shell output to log files (if applicable)
3. Reports only: final state, structural changes, or "✓ Done"
4. Hides all intermediate steps and verbose output
