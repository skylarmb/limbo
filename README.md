# Limbo

> [!NOTE]
> Limbo is a work in progress. Features, keys, and configuration can change
> without notice.

A terminal dashboard for your GitHub pull requests. Limbo lists the PRs that
you opened, the PRs that involve you, and the PRs that wait for your review,
across a set of repos. Each PR shows one status, so you can see which PRs need
you.

## Requirements

- [Bun](https://bun.sh).
- A GitHub token. Limbo uses `GITHUB_TOKEN` if it is set. If not, Limbo gets
  the token from the [GitHub CLI](https://cli.github.com) with `gh auth token`.
- macOS for the `o` and `y` keys. These keys use `open` and `pbcopy`.

## Setup

1. Install the dependencies:

   ```sh
   bun install
   ```

2. Set `LIMBO_REPOS` to a comma-separated list of `owner/name` repos:

   ```sh
   export LIMBO_REPOS=owner/repo,owner/other-repo
   ```

   If you use [direnv](https://direnv.net), copy `.env.example` to `.env` and
   edit `.env` instead. The `.envrc` file loads `.env`.

3. Start Limbo:

   ```sh
   bun start
   ```

## Keys

| Key     | Action                                       |
| ------- | -------------------------------------------- |
| `j` `k` | Move the cursor down or up                   |
| `o`     | Open the selected PR in the browser          |
| `y`     | Copy the URL of the selected PR              |
| `c`     | Toggle between open and closed PRs           |
| `r`     | Refresh now                                  |
| `q`     | Quit (press `Enter` or `q` again to confirm) |

Limbo also refreshes every 60 seconds.

## Sections

Limbo shows these sections, top to bottom:

| Section          | GitHub search qualifier |
| ---------------- | ----------------------- |
| My PRs           | `author:@me`            |
| Involves me      | `involves:@me`          |
| Review requested | `review-requested:@me`  |

A PR shows only in the first section that matches it. Each section shows at
most 10 PRs, newest first.

To change the sections, edit `SECTIONS` in `src/config.ts`. A section can also
set a focus status. In that section, open PRs with a different status move to
the bottom and show in gray.

## Statuses

Each open PR shows the first status that applies, in this order:

1. draft
2. ci failing
3. ci running
4. conflicts
5. changes requested
6. awaiting review
7. ready

Closed PRs show merged or closed.

## Development

```sh
bun run dev    # Start Limbo and restart it when a file changes
bun run demo   # Start Limbo with static example data, for screenshots
bun run check  # Typecheck, lint, and test
```

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
