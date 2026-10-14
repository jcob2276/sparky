import {expect,it} from 'vitest';
import {estimateGlycemicResponse} from '../../../packages/domain/src/training/glycemicResponse';
it('leaves unknown GI and carbohydrate definitions unknown rather than assigning a low glucose response',()=>{
  const result=estimateGlycemicResponse([{id:'one',name:'Ryż',grams:200,carbsPer100g:28,carbDefinition:'available',referenceId:null,portionConfirmed:true}]);
  expect(result.state).toBe('missing');expect(result.estimatedLoad).toBeNull();
  expect(result).not.toHaveProperty('absorptionProfile');
});
it('uses a verified GI and the actual portion without subtracting fiber twice',()=>{
  const input={id:'one',name:'Basmati',grams:200,carbsPer100g:28,fiberPer100g:3,carbDefinition:'available' as const,referenceId:'basmati-white-uk-10min',portionConfirmed:true};
  expect(estimateGlycemicResponse([input]).estimatedLoad).toBe(28);
  expect(estimateGlycemicResponse([{...input,grams:100}]).estimatedLoad).toBe(14);
  expect(estimateGlycemicResponse([{...input,carbDefinition:'total_including_fiber'}]).estimatedLoad).toBe(25);
  expect(estimateGlycemicResponse([{...input,carbDefinition:'total_including_fiber',fiberPer100g:null}]).estimatedLoad).toBeNull();
});
it('never presents a partial ingredient sum as the whole meal or trusts a made-up reference',()=>{
  const input={id:'one',name:'Basmati',grams:100,carbsPer100g:28,carbDefinition:'available' as const,referenceId:'basmati-white-uk-10min',portionConfirmed:true};
  const result=estimateGlycemicResponse([input,{...input,id:'two',name:'Sos',referenceId:'made-up'}]);
  expect(result.state).toBe('partial');expect(result.estimatedLoad).toBeNull();expect(result.knownLoad).toBe(14);expect(result.uncovered).toContain('Sos');
});
