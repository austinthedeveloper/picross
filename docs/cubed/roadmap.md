# Picross Cubed: roadmap

v1.0 brings over everything the 2D game has: free play, an editor, the daily puzzle,
dioramas (its murals), badges, and the whole story with every enemy power. The backlog
lives on GitHub: the [project board](https://github.com/users/austinthedeveloper/projects/8)
and [milestones](https://github.com/austinthedeveloper/picross-3d/milestones).

## Still open

- **Real-device pass** (#49): [the checklist](device-checklist.md), on a real iPhone and
  Android phone
- **Endless mode**, which the 2D game has and this one doesn't yet
- **More puzzles and dioramas**, toward 10×10×10, as sheets

## After that

[Combining with the 2D game](../combining.md): one game with both, and bosses that switch
from a 2D board to a block mid-fight. The monorepo part (steps 1 to 3) is done.

## Releases

Cubed ships with the 2D game now: `npm run build` puts it in `dist/3d/`, and a 2D release
deploys both (see [development.md](../development.md#azure-deployment-releases)). Its own
`release.yml` went when the games shared a site. The notes for its releases as a separate
game are in [releases/](releases/).
