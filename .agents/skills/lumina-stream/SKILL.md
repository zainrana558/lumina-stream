```markdown
# lumina-stream Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `lumina-stream` TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns. By following these guidelines, contributors can ensure consistency and maintainability across the project.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `streamManager.ts`, `userProfile.test.ts`

### Import Style
- Use **absolute imports** for modules.
  - Example:
    ```typescript
    import { StreamManager } from 'src/streamManager';
    ```

### Export Style
- Use **named exports** exclusively.
  - Example:
    ```typescript
    // In streamManager.ts
    export function startStream() { ... }
    export function stopStream() { ... }
    ```

### Commit Message Conventions
- Follow **Conventional Commits** with these prefixes:
  - `feat`: New features
  - `fix`: Bug fixes
  - `chore`: Maintenance tasks
- Keep commit messages concise (average 65 characters).
  - Example:
    ```
    feat: add support for multiple stream sources
    fix: resolve stream disconnect issue
    chore: update dependencies
    ```

## Workflows

### Creating a Feature
**Trigger:** When adding a new feature  
**Command:** `/create-feature`

1. Create a new branch with a descriptive name (e.g., `feat/multiStreamSupport`).
2. Implement the feature using camelCase file naming and absolute imports.
3. Use named exports for all new modules.
4. Write or update tests in corresponding `*.test.ts` files.
5. Commit changes with a `feat:` prefix and concise description.
6. Open a pull request for review.

### Fixing a Bug
**Trigger:** When resolving a bug  
**Command:** `/fix-bug`

1. Create a new branch (e.g., `fix/streamDisconnect`).
2. Locate and fix the bug, following code conventions.
3. Update or add tests to cover the fix.
4. Commit changes with a `fix:` prefix and concise description.
5. Open a pull request for review.

### Maintenance or Chores
**Trigger:** For dependency updates or refactoring  
**Command:** `/chore-task`

1. Create a branch (e.g., `chore/updateDeps`).
2. Make necessary maintenance changes.
3. Commit with a `chore:` prefix.
4. Open a pull request.

## Testing Patterns

- Test files use the pattern `*.test.ts`.
- The testing framework is not specified; follow existing patterns in the codebase.
- Place tests alongside the modules they test or in a dedicated `tests` directory.
- Example test file:
  ```typescript
  // userProfile.test.ts
  import { getUserProfile } from 'src/userProfile';

  describe('getUserProfile', () => {
    it('returns user data for valid ID', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command           | Purpose                                 |
|-------------------|-----------------------------------------|
| /create-feature   | Start a new feature implementation      |
| /fix-bug          | Begin work on a bug fix                 |
| /chore-task       | Perform maintenance or chore tasks      |
```
