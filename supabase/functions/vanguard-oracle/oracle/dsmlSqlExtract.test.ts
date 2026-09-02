import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  containsDsmlToolMarkup,
  extractAllSqlFromDsml,
  stripDsmlMarkup,
} from "./dsmlSqlExtract.ts";

const WORKOUT_DSML = `< | | DSML | | tool_calls >
< | | DSML | | invoke >
< | | DSML | | parameter >
SELECT ws.id, ws.date FROM workout_sessions ws WHERE ws.date = '2026-08-31'
< | | DSML | | /parameter >
< | | DSML | | /invoke >
< | | DSML | | /tool_calls >`;

const DOUBLE_DSML = `< | | DSML | | invoke name="query_database" >
< | | DSML | | parameter >
SELECT el.exercise_name FROM exercise_logs el
< | | DSML | | invoke name="query_database" >
< | | DSML | | parameter >
SELECT date, name FROM supplement_logs LIMIT 30`;

Deno.test("containsDsmlToolMarkup — wykrywa tagi DSML", () => {
  assertEquals(containsDsmlToolMarkup(WORKOUT_DSML), true);
  assertEquals(containsDsmlToolMarkup("zwykła odpowiedź"), false);
});

Deno.test("extractAllSqlFromDsml — pierwsze SELECT z nowego formatu DSML", () => {
  const sql = extractAllSqlFromDsml(WORKOUT_DSML)[0];
  assertEquals(sql, "SELECT ws.id, ws.date FROM workout_sessions ws WHERE ws.date = '2026-08-31'");
});

Deno.test("extractAllSqlFromDsml — wyciąga wiele zapytań z jednej wiadomości", () => {
  const sqls = extractAllSqlFromDsml(DOUBLE_DSML);
  assertEquals(sqls.length, 2);
  assertEquals(sqls[0], "SELECT el.exercise_name FROM exercise_logs el");
  assertEquals(sqls[1], "SELECT date, name FROM supplement_logs LIMIT 30");
});

Deno.test("stripDsmlMarkup — usuwa tagi z wycieku", () => {
  const stripped = stripDsmlMarkup(WORKOUT_DSML);
  assertEquals(stripped.includes("DSML"), false);
  assertEquals(stripped.includes("SELECT ws.id"), true);
});
