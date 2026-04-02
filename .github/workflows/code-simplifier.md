---
name: Code Simplifier
description: Continuously scans the codebase for complex functions with high cyclomatic complexity, deep nesting, and long methods. Proposes simpler, more maintainable alternatives and opens a draft PR with the refactored code.
on:
  schedule: weekly
  workflow_dispatch:
  # push:
  #   branches:
  #     - main
permissions:
  contents: read
  pull-requests: read
  issues: read
tools:
  github:
    toolsets: [default]
  bash: true
  edit:
safe-outputs:
  create-pull-request:
    title-prefix: "[ai] "
    labels: [refactor, code-quality]
    draft: true
    if-no-changes: warn
---

# Code Simplifier

Your task is to continuously improve code quality by identifying and refactoring overly complex functions in this repository.

## Instructions

### Step 1: Discover the codebase

Use bash to discover what languages and files exist in the repository:

```bash
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rb" -o -name "*.cs" -o -name "*.cpp" -o -name "*.c" \) \
  ! -path "./.git/*" ! -path "./node_modules/*" ! -path "./__pycache__/*" ! -path "./vendor/*" | head -200
```

### Step 2: Identify complex code

For each relevant source file, analyze the code looking for:

1. **High cyclomatic complexity** — functions with many branches (`if`, `else`, `switch`, `case`, `while`, `for`, `try`, `catch`, `&&`, `||`). Target: functions with 10+ branches.
2. **Deep nesting** — code indented more than 4 levels deep. This is a sign the logic should be extracted into helper functions.
3. **Long methods** — functions/methods exceeding ~50 lines. Large methods should be decomposed.
4. **Other smells** — duplicated logic, complex boolean expressions, multiple return paths that could be simplified.

Use bash tools to help identify candidates:

```bash
# Count lines per function (approximate) - example for Python
grep -n "^def \|^    def \|^class " <file> | head -50

# Find deeply nested code (many levels of indentation)
grep -n "^                " <file> | head -20
```

Read the flagged files carefully to understand the code.

### Step 3: Select the top candidates

Choose up to **5 functions** that would benefit most from refactoring. For each, document:

- File path and function/method name
- The specific problem (cyclomatic complexity, deep nesting, long method, etc.)
- A brief explanation of how it can be simplified

### Step 4: Refactor the code

For each selected function, apply one or more of these simplification strategies:

- **Extract method**: Break a large function into smaller, well-named helpers
- **Early returns / guard clauses**: Replace nested if-else chains with early returns
- **Replace conditionals with polymorphism or strategy**: If applicable
- **Simplify boolean expressions**: Use De Morgan's laws, extract named conditions
- **Reduce cyclomatic complexity**: Flatten nested loops/conditionals

Use the `edit` tool to apply the refactored code to the actual files. Make sure:

- The refactored code is functionally equivalent to the original
- Variable and function names are clear and descriptive
- Comments explain non-obvious logic

### Step 5: Create a draft PR

After applying all refactors, create a draft pull request with:

- **Title**: A concise summary, e.g. `Simplify complex functions in [module/file]`
- **Branch name**: `refactor/code-simplifier`
- **Body**: Include a summary structured as follows:

  ```
  ## Summary

  This PR refactors complex functions to improve maintainability and readability.

  ## Changes

  For each refactored function:
  - **File**: `<path>`
  - **Function**: `<name>`
  - **Issue**: <what was wrong>
  - **Fix**: <what was done>

  ## Complexity Improvements

  List the approximate before/after metrics (e.g., lines reduced, nesting levels reduced, branches reduced).
  ```

Output a `create-pull-request` safe output with the above details.
