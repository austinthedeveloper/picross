import { fakeClues } from '../engine/fakes';
import { hasLine, lineKeys, unionLines, type LineSet } from '../engine/lines';
import type { Enemy, Phase } from '../game/battle';
import type { Puzzle } from './format';

/**
 * Parses and validates a fight's enemy (#27) against its puzzle: HP and
 * attack, fog (#30), scramble (#49), armor (#50), forged clues (#64), charge
 * and ink (#67), and phases (#42, #48).
 */
export function parseEnemy(data: unknown, puzzle: Puzzle, fail: (msg: string) => never): Enemy {
  const enemy = data as Partial<Enemy> | undefined;
  if (!enemy || typeof enemy !== 'object') return fail('fights need an enemy');
  if (typeof enemy.name !== 'string' || !enemy.name) fail('enemy needs a name');
  if (!Number.isInteger(enemy.hp) || enemy.hp! < 1) fail('enemy hp must be a positive integer');
  if (!Number.isInteger(enemy.attack) || enemy.attack! < 0) {
    fail('enemy attack must be a whole number');
  }
  const parsed: Enemy = {
    name: enemy.name!,
    sprite: typeof enemy.sprite === 'string' ? enemy.sprite : '👾',
    hp: enemy.hp!,
    attack: enemy.attack!,
  };
  const parseFog = (data: unknown): LineSet => {
    const { rows = [], cols = [] } = (data ?? {}) as Partial<LineSet>;
    const inRange = (list: unknown, size: number) =>
      Array.isArray(list) && list.every((i) => Number.isInteger(i) && i >= 0 && i < size);
    if (!inRange(rows, puzzle.height) || !inRange(cols, puzzle.width)) {
      fail('fog rows and cols must be line indexes within the puzzle');
    }
    return { rows: [...rows], cols: [...cols] };
  };
  // A scrambled line needs at least two different run lengths, or its order is already known.
  const parseScramble = (data: unknown): LineSet => {
    const scramble = parseFog(data);
    for (const [kind, list] of [
      ['row', scramble.rows],
      ['col', scramble.cols],
    ] as const) {
      for (const i of list) {
        const runs = (kind === 'row' ? puzzle.clues.rows : puzzle.clues.cols)[i];
        if (new Set(runs).size < 2) {
          fail(
            `${kind} ${i + 1} can't be scrambled: its runs (${runs.join(' ') || 'none'}) have only one order`,
          );
        }
      }
    }
    return scramble;
  };
  const positiveCount = (value: unknown, label: string) => {
    if (value !== undefined && (!Number.isInteger(value) || (value as number) < 1)) {
      fail(`${label} must be a positive whole number`);
    }
  };

  const seconds = (value: unknown, label: string) => {
    if (typeof value !== 'number' || !(value >= 3)) fail(`${label} must be at least 3 seconds`);
    return value as number;
  };
  if (enemy.charge !== undefined) parsed.charge = seconds(enemy.charge, 'charge');
  if (enemy.fog !== undefined) parsed.fog = parseFog(enemy.fog);
  if (enemy.scramble !== undefined) parsed.scramble = parseScramble(enemy.scramble);
  if (enemy.armor !== undefined) {
    const armor = enemy.armor as Partial<Enemy['armor'] & object>;
    const weakPoints = parseFog(armor.weakPoints);
    if (!weakPoints.rows.length && !weakPoints.cols.length) fail('armor needs weak points');
    if (!Number.isInteger(armor.attack) || armor.attack! < 0) {
      fail('armor attack must be a whole number');
    }
    parsed.armor = { weakPoints, attack: armor.attack! };
  }

  if (enemy.phases !== undefined) {
    if (!Array.isArray(enemy.phases)) fail('phases must be a list');
    parsed.phases = enemy.phases!.map((data, i): Phase => {
      const phase = (data ?? {}) as Partial<Phase>;
      const at = phase.at;
      if (typeof at !== 'number' || !(at > 0 && at < 1))
        fail(`phase ${i + 1} needs "at" between 0 and 1`);
      if (i > 0 && at! >= enemy.phases![i - 1].at) fail('phases must trigger at decreasing HP');
      if (phase.attack !== undefined && (!Number.isInteger(phase.attack) || phase.attack < 0)) {
        fail(`phase ${i + 1} attack must be a whole number`);
      }
      positiveCount(phase.fogCount, `phase ${i + 1} fogCount`);
      positiveCount(phase.scrambleCount, `phase ${i + 1} scrambleCount`);
      if (phase.swap !== undefined && typeof phase.swap !== 'boolean') {
        fail(`phase ${i + 1} swap must be true or false`);
      }
      positiveCount(phase.ink, `phase ${i + 1} ink`);
      positiveCount(phase.inkCount, `phase ${i + 1} inkCount`);
      if (phase.inkCount !== undefined && phase.ink === undefined) {
        fail(`phase ${i + 1} has inkCount but no ink`);
      }
      return {
        at: at!,
        ...(phase.name ? { name: phase.name } : {}),
        ...(phase.sprite ? { sprite: phase.sprite } : {}),
        ...(phase.attack !== undefined ? { attack: phase.attack } : {}),
        ...(phase.taunt ? { taunt: phase.taunt } : {}),
        ...(phase.fog !== undefined ? { fog: parseFog(phase.fog) } : {}),
        ...(phase.fogCount !== undefined ? { fogCount: phase.fogCount } : {}),
        ...(phase.swap === true ? { swap: true } : {}),
        ...(phase.scramble !== undefined ? { scramble: parseScramble(phase.scramble) } : {}),
        ...(phase.scrambleCount !== undefined ? { scrambleCount: phase.scrambleCount } : {}),
        ...(phase.ink !== undefined ? { ink: phase.ink } : {}),
        ...(phase.inkCount !== undefined ? { inkCount: phase.inkCount } : {}),
        ...(phase.charge !== undefined
          ? { charge: seconds(phase.charge, `phase ${i + 1} charge`) }
          : {}),
      };
    });
  }

  // The cell where a fogged row and column cross could never be worked out, so all
  // of an enemy's fog (starting and from every phase) must be in one direction.
  const all = allFog(parsed);
  if (all.rows.length && all.cols.length) fail('fog can cover rows or columns, not both');

  // A forged clue must be readable (not fogged or scrambled) to be worth calling out.
  if (enemy.fakes !== undefined) {
    const fakes = parseFog(enemy.fakes);
    if (!fakes.rows.length && !fakes.cols.length) fail('fakes needs at least one line');
    const covered = unionLines([all, allScramble(parsed)]);
    for (const key of lineKeys(fakes)) {
      const [kind, index] = [key[0] === 'r' ? 'row' : 'col', Number(key.slice(1))] as const;
      if (hasLine(covered, kind, index))
        fail(`${kind} ${index + 1} can't be both forged and fogged or scrambled`);
    }
    try {
      fakeClues(puzzle.width, puzzle.height, puzzle.clues, fakes);
    } catch (e) {
      fail((e as Error).message);
    }
    parsed.fakes = fakes;
    // You're told which lines might be forged, never which ones are: the suspects
    // hold every fake and at least one honest line.
    const suspects = parseFog(enemy.suspects);
    for (const key of lineKeys(fakes)) {
      if (!lineKeys(suspects).includes(key))
        fail(`suspects must include every fake (missing ${key})`);
    }
    if (lineKeys(suspects).length <= lineKeys(fakes).length) {
      fail('suspects need at least one honest line besides the fakes');
    }
    for (const key of lineKeys(suspects)) {
      const [kind, index] = [key[0] === 'r' ? 'row' : 'col', Number(key.slice(1))] as const;
      if (hasLine(covered, kind, index))
        fail(`${kind} ${index + 1} can't be both a suspect and fogged or scrambled`);
    }
    parsed.suspects = suspects;
  } else if (enemy.suspects !== undefined) {
    fail('suspects only make sense with fakes');
  }
  return parsed;
}

/** Every line an enemy can ever fog: its starting fog plus every phase's. */
export function allFog(enemy: Enemy): LineSet {
  return unionLines([enemy.fog, ...(enemy.phases ?? []).map((p) => p.fog)]);
}

/**
 * Every line whose clue you can't trust from the start: all its fog, plus every
 * 🎭 suspect (#64), since you don't know which of those lie. The puzzle must be
 * solvable without any of them, so each suspect can be settled by logic, and
 * each forgery contradicts the real picture.
 */
export function allUnreadable(enemy: Enemy): LineSet {
  return unionLines([allFog(enemy), enemy.suspects]);
}

/** Every line an enemy can ever scramble: its starting scramble plus every phase's. */
export function allScramble(enemy: Enemy): LineSet {
  return unionLines([enemy.scramble, ...(enemy.phases ?? []).map((p) => p.scramble)]);
}

/** An enemy power (#79): what the tip cards and the ⓘ list explain. */
export type Power = 'fog' | 'scramble' | 'armor' | 'fakes' | 'charge' | 'ink' | 'swap';

/** Powers an enemy has before any phase starts. */
export function startingPowers(enemy: Enemy): Power[] {
  const powers: Power[] = [];
  if (enemy.fog) powers.push('fog');
  if (enemy.scramble) powers.push('scramble');
  if (enemy.armor) powers.push('armor');
  if (enemy.fakes) powers.push('fakes');
  if (enemy.charge) powers.push('charge');
  return powers;
}

/** Powers a phase brings in when it starts. */
export function phasePowers(phase: Phase): Power[] {
  const powers: Power[] = [];
  if (phase.fog) powers.push('fog');
  if (phase.scramble) powers.push('scramble');
  if (phase.charge) powers.push('charge');
  if (phase.ink) powers.push('ink');
  if (phase.swap) powers.push('swap');
  return powers;
}

/** Every power an enemy has, from the start or any phase, each once. */
export function enemyPowers(enemy: Enemy): Power[] {
  return [...new Set([...startingPowers(enemy), ...(enemy.phases ?? []).flatMap(phasePowers)])];
}
