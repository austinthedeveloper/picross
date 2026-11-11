import { tileIdsOf } from './catalog';
import { parseDiorama, type Diorama, type DioramaFile } from './diorama';

export * from './diorama';

const files = import.meta.glob<DioramaFile>('./dioramas/*.json', {
  eager: true,
  import: 'default',
});
let cache: Diorama[] | null = null;

/** Every diorama (split on first use: picking hidden clues takes a moment). */
export function dioramas(): Diorama[] {
  cache ??= Object.values(files)
    .map(parseDiorama)
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

export const getDiorama = (id: string) => dioramas().find((d) => d.id === id);

/** Every diorama's tile puzzle ids, without splitting them (cheap, for badges). */
export const dioramaTileIds = (): string[] => Object.values(files).flatMap(tileIdsOf);
