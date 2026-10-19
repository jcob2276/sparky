import { describe, expect, it } from 'vitest';
import { isIsometricExercise, resolveBwSkillCue } from './bwSkillLadders';

describe('resolveBwSkillCue', () => {
  it('maps pompki to next diamond step', () => {
    const cue = resolveBwSkillCue('Pompki');
    expect(cue?.familyId).toBe('pushup');
    expect(cue?.currentLabel).toBe('Pompki');
    expect(cue?.nextLabel).toBe('Pompki diamentowe');
    expect(cue?.summary).toContain('drabinka');
  });

  it('picks knee over generic when name has kolana', () => {
    const cue = resolveBwSkillCue('Pompki na kolanach');
    expect(cue?.currentLabel).toBe('Pompki na kolanach');
    expect(cue?.nextLabel).toBe('Pompki');
  });

  it('resolves pull-up nachwytem as full', () => {
    const cue = resolveBwSkillCue('Podciąganie nachwytem');
    expect(cue?.familyId).toBe('pullup');
    expect(cue?.currentLabel).toBe('Podciągania');
    expect(cue?.nextLabel).toBe('Podciągania L-sit');
  });

  it('resolves weighted dips as top of dip ladder', () => {
    const cue = resolveBwSkillCue('Dipy z obciążeniem');
    expect(cue?.familyId).toBe('dip');
    expect(cue?.nextLabel).toBeNull();
    expect(cue?.summary).toContain('szczyt');
  });

  it('returns null for unrelated barbell work', () => {
    expect(resolveBwSkillCue('Wyciskanie leżąc')).toBeNull();
  });
});

describe('isIsometricExercise', () => {
  it('flags plank and hang', () => {
    expect(isIsometricExercise('Plank')).toBe(true);
    expect(isIsometricExercise('Zwis pasywny')).toBe(true);
    expect(isIsometricExercise('Pompki')).toBe(false);
  });
});
