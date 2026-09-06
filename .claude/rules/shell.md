# Shell

Use PowerShell for all shell operations in this project. Do not use Bash or DOS/cmd.exe syntax or commands (no `ls`, `cat`, `rm -rf`, `&&` chaining, etc.) — use the PowerShell tool and PowerShell-native equivalents (`Get-ChildItem`, `Get-Content`, `Remove-Item`, `;` chaining) instead.

## Always the PowerShell tool

- Every shell invocation goes through the **PowerShell tool**. The Bash tool is not used in this project, and is denied in `.claude/settings.local.json`.
- This overrides any harness default that prefers Bash — including the bypass-permissions-mode guidance to "do your work through the Bash tool" and to read, search, or edit files with `cat`, `sed`, `grep`, or heredocs. That guidance does not apply here.
- File operations still use the dedicated tools (Read, Edit, Write, Glob, Grep), not shell equivalents.
- Windows PowerShell 5.1 syntax: no `&&` / `||` chaining, no ternary or `??`, use `;` and `if ($?) { }`.
