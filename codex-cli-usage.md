## Non-Interactive Mode Parameters

**`--full-auto`** - This is the primary parameter for fully non-interactive operation:

````bash
codex --full-auto "Your request here"
````

**`--auto-edit`** - Partially non-interactive (automatically edits files but asks for shell command approval):

````bash
codex --auto-edit "Your request here"
````

## Examples

**Fully autonomous data analysis:**
````bash
codex --full-auto "Please analyze the dataset.csv file and generate the analytical report in PDF format."
````

**Auto-edit mode example:**
````bash
codex --auto-edit "Refactor this React component to use hooks"
````

## Mode Switching

You can also switch modes during a session using:
- `/mode` - Toggle between modes interactively
- Start with `--suggest` (default), `--auto-edit`, or `--full-auto`

## Key Differences

- **`--suggest`** (default): Asks permission for every action
- **`--auto-edit`**: Automatically creates/edits files but asks for shell command approval
- **`--full-auto`**: Completely autonomous - handles file creation, editing, and shell commands without any user input

## Security Note

Even in `--full-auto` mode, Codex runs commands in a sandbox environment for security, so it's safe for automated scripting workflows.

For scripting purposes, `--full-auto` is what you want for completely hands-off operation.