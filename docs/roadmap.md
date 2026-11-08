# Roadmap

v1.0 brings over everything the 2D game has: free play, an editor, the daily puzzle,
dioramas (its murals), badges, and the whole story with every enemy power. The backlog
lives on GitHub: the [project board](https://github.com/users/austinthedeveloper/projects/8)
and [milestones](https://github.com/austinthedeveloper/picross-3d/milestones).

## Still open

- **Real-device pass** (#49): [the checklist](device-checklist.md), on a real iPhone and
  Android phone
- **Endless mode**, which the 2D game has and this one doesn't yet
- **More puzzles and dioramas**, toward 10×10×10, as sheets

## How releases work

- Bump `version` in `package.json`, add `docs/releases/vX.Y.Z.md`, merge, then tag `vX.Y.Z`
  on `main` and push the tag. `release.yml` checks, builds, publishes the release with the
  site zipped, and redeploys the site with it at the root.
