-- Keep the existing deduplication, owner RLS and column order; expose real import provenance.
CREATE OR REPLACE VIEW public.strava_activities_clean WITH (security_invoker = true) AS
 WITH tagged AS (
         SELECT strava_activities.strava_id,
            strava_activities.user_id,
            strava_activities.name,
            strava_activities.sport_type,
            strava_activities.start_date,
            strava_activities.elapsed_time,
            strava_activities.moving_time,
            strava_activities.distance,
            strava_activities.average_heartrate,
            strava_activities.max_heartrate,
            strava_activities.average_speed,
            strava_activities.max_speed,
            strava_activities.total_elevation_gain,
            strava_activities.calories,
            strava_activities.suffer_score,
            strava_activities.perceived_exertion,
            strava_activities.manual,
            strava_activities.raw_data,
            strava_activities.synced_at,
            strava_activities.source,
            strava_activities.icu_activity_id,
            strava_activities.icu_hr_zone_times,
            strava_activities.trimp,
            strava_activities.hr_avg,
            strava_activities.hr_max,
            strava_activities.hr_source,
            strava_activities.hr_frozen,
            strava_activities.splits_with_hr,
            strava_activities.gear_name,
            strava_activities.gear_distance_km,
            strava_activities.is_oura_duplicate,
            strava_activities.gc_activity_id,
            strava_activities.gc_hr_zones,
            strava_activities.gc_weather,
            strava_activities.gc_laps,
            strava_activities.gc_training_effect_aerobic,
            strava_activities.gc_training_effect_anaerobic,
            strava_activities.gc_vo2max,
            strava_activities.gc_enriched_at,
            strava_activities.name ~~* '%oura%'::text OR COALESCE(strava_activities.is_oura_duplicate, false) = true AS is_oura
           FROM strava_activities
        ), enriched AS (
         SELECT a.strava_id,
            a.user_id,
            a.name,
            a.sport_type,
            a.start_date,
            a.elapsed_time,
            a.moving_time,
            a.distance,
            a.average_speed,
            a.max_speed,
            a.total_elevation_gain,
            a.suffer_score,
            a.perceived_exertion,
            a.manual,
            a.is_oura,
            a.elapsed_time - a.moving_time AS pause_seconds,
                CASE
                    WHEN a.average_speed > 0::double precision THEN round(1000.0::double precision / a.average_speed)::integer
                    ELSE NULL::integer
                END AS pace_sec_per_km,
                CASE
                    WHEN (a.raw_data ->> 'average_cadence'::text) IS NOT NULL THEN round(((a.raw_data ->> 'average_cadence'::text)::numeric) * 2::numeric)::integer
                    ELSE NULL::integer
                END AS cadence_spm,
            (a.raw_data ->> 'workout_type'::text)::integer AS workout_type,
            a.gear_name,
            a.gear_distance_km,
            COALESCE((a.raw_data ->> 'pr_count'::text)::integer, 0) > 0 AS has_pr,
            COALESCE((a.raw_data ->> 'achievement_count'::text)::integer, 0) AS achievement_count,
            a.raw_data -> 'best_efforts'::text AS best_efforts,
            COALESCE(a.hr_avg, ( SELECT o.hr_avg
                   FROM tagged o
                  WHERE o.user_id = a.user_id AND o.sport_type = a.sport_type AND o.is_oura = true AND o.hr_avg IS NOT NULL AND abs(EXTRACT(epoch FROM o.start_date - a.start_date)) < 120::numeric
                  ORDER BY (abs(EXTRACT(epoch FROM o.start_date - a.start_date)))
                 LIMIT 1), a.average_heartrate) AS hr_avg,
            COALESCE(a.hr_max, ( SELECT o.hr_max
                   FROM tagged o
                  WHERE o.user_id = a.user_id AND o.sport_type = a.sport_type AND o.is_oura = true AND o.hr_max IS NOT NULL AND abs(EXTRACT(epoch FROM o.start_date - a.start_date)) < 120::numeric
                  ORDER BY (abs(EXTRACT(epoch FROM o.start_date - a.start_date)))
                 LIMIT 1), a.max_heartrate) AS hr_max,
            COALESCE(a.hr_source,
                CASE
                    WHEN a.average_heartrate IS NOT NULL THEN 'strava'::text
                    WHEN (EXISTS ( SELECT 1
                       FROM tagged o
                      WHERE o.user_id = a.user_id AND o.sport_type = a.sport_type AND o.is_oura = true AND o.hr_avg IS NOT NULL AND abs(EXTRACT(epoch FROM o.start_date - a.start_date)) < 120::numeric)) THEN 'oura'::text
                    ELSE NULL::text
                END) AS hr_source,
            COALESCE(a.hr_frozen, false) AS hr_frozen,
            COALESCE(a.splits_with_hr, a.raw_data -> 'splits_metric'::text) AS splits_with_hr,
            a.gc_activity_id,
            a.gc_hr_zones,
            a.gc_weather,
            a.gc_laps,
            a.gc_training_effect_aerobic,
            a.gc_training_effect_anaerobic,
            a.gc_vo2max,
            a.gc_enriched_at,
            a.synced_at,
            a.source,
            a.icu_activity_id,
            a.icu_hr_zone_times,
            a.trimp
           FROM tagged a
          WHERE NOT (a.is_oura = true AND (EXISTS ( SELECT 1
                   FROM tagged b
                  WHERE b.user_id = a.user_id AND b.sport_type = a.sport_type AND b.is_oura = false AND abs(EXTRACT(epoch FROM b.start_date - a.start_date)) < 120::numeric)))
        )
 SELECT strava_id,
    user_id,
    name,
    sport_type,
    start_date,
    elapsed_time,
    moving_time,
    distance,
    average_speed,
    max_speed,
    total_elevation_gain,
    suffer_score,
    perceived_exertion,
    manual,
    is_oura,
    pause_seconds,
    pace_sec_per_km,
    cadence_spm,
    workout_type,
    gear_name,
    gear_distance_km,
    has_pr,
    achievement_count,
    best_efforts,
    hr_avg,
    hr_max,
    hr_source,
    hr_frozen,
    splits_with_hr,
    gc_activity_id,
    gc_hr_zones,
    gc_weather,
    gc_laps,
    gc_training_effect_aerobic,
    gc_training_effect_anaerobic,
    gc_vo2max,
    gc_enriched_at,
    synced_at,
    source,
    icu_activity_id,
    icu_hr_zone_times,
    trimp
   FROM enriched;
COMMENT ON VIEW public.strava_activities_clean IS 'Canonical deduplicated activities. Legacy name; Garmin is imported through Intervals.icu (source=garmin_intervals). HR source is independent of activity provenance.';
