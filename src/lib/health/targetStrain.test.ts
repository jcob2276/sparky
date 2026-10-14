import {describe,expect,it} from 'vitest';
import {calculateTargetStrain} from '@vanguard/domain';
describe('training load evidence',()=>{
  it('does not invent an optimal or all-out target from a recovery score',()=>{
    const result=calculateTargetStrain(95,5);
    expect(result.targetMin).toBeNull();expect(result.targetMax).toBeNull();
    expect(result.intensityCategory).toBe('unknown');
    expect(result.recommendation).not.toContain('gotowy na więcej');
  });
  it('keeps missing and invalid strain distinct from measured zero',()=>{
    expect(calculateTargetStrain(null,null).currentStrain).toBeNull();
    expect(calculateTargetStrain(null,0).currentStrain).toBe(0);
    expect(calculateTargetStrain(120,-5).currentStrain).toBeNull();
    expect(calculateTargetStrain(120,5).recoveryScore).toBeNull();
    expect(calculateTargetStrain(0,5).hasRecoveryData).toBe(true);
  });
});
