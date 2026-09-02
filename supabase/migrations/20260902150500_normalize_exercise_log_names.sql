-- Jednorazowa normalizacja exercise_name → kanoniczna nazwa (pierwsza z EXERCISE_ALIAS_GROUPS).
-- Odwracalne tylko z backupu — mapowanie jest jednokierunkowe.

BEGIN;

UPDATE public.exercise_logs SET exercise_name = 'Wyciskanie płaskie'
WHERE exercise_name IN ('Wyciskanie sztangi na ławce', 'Bench press');

UPDATE public.exercise_logs SET exercise_name = 'Wyciskanie skośne'
WHERE exercise_name = 'Wyciskanie na skosie';

UPDATE public.exercise_logs SET exercise_name = 'Wyciskanie hantli na ławce'
WHERE exercise_name = 'Wyciskanie hantli';

UPDATE public.exercise_logs SET exercise_name = 'Martwy ciąg'
WHERE exercise_name IN ('Martwy ciąg klasyczny', 'Martwy Ciąg');

UPDATE public.exercise_logs SET exercise_name = 'Martwy ciąg rumuński'
WHERE exercise_name = 'RDL';

UPDATE public.exercise_logs SET exercise_name = 'Przysiad ze sztangą'
WHERE exercise_name IN ('Przysiad', 'Back squat');

UPDATE public.exercise_logs SET exercise_name = 'Podciąganie nachwytem'
WHERE exercise_name IN ('Podciąganie', 'Pull-up');

UPDATE public.exercise_logs SET exercise_name = 'Wiosłowanie sztangą'
WHERE exercise_name = 'Wiosłowanie';

UPDATE public.exercise_logs SET exercise_name = 'Wiosłowanie jedną ręką'
WHERE exercise_name = 'Wiosłowanie hantlem';

UPDATE public.exercise_logs SET exercise_name = 'Dipy'
WHERE exercise_name = 'Dips';

UPDATE public.exercise_logs SET exercise_name = 'OHP sztangą'
WHERE exercise_name IN ('OHP', 'Wyciskanie żołnierskie');

UPDATE public.exercise_logs SET exercise_name = 'OHP hantlami'
WHERE exercise_name = 'Wyciskanie hantli nad głowę';

UPDATE public.exercise_logs SET exercise_name = 'Lat Pulldown'
WHERE exercise_name = 'Ściąganie drążka';

UPDATE public.exercise_logs SET exercise_name = 'Leg press'
WHERE exercise_name IN ('Leg Press', 'Suwnica');

UPDATE public.exercise_logs SET exercise_name = 'Hip thrust'
WHERE exercise_name = 'Hip Thrust';

UPDATE public.exercise_logs SET exercise_name = 'Wykroki (miejsce/bułgar)'
WHERE exercise_name IN ('Wykroki', 'Bułgarski przysiad');

UPDATE public.exercise_logs SET exercise_name = 'Sauna'
WHERE exercise_name = 'Sauna — 80 stopni';

UPDATE public.exercise_logs SET exercise_name = 'Wspięcia na łydki'
WHERE exercise_name = 'Wspięcia na palce';

COMMIT;
