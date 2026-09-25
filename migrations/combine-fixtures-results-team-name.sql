-- One-off: combine sport + team_name on existing fixtures and results.
-- Safe to re-run: skips rows whose team_name already starts with sport.

UPDATE fixtures
SET team_name = trim(sport || ' ' || team_name)
WHERE sport IS NOT NULL
  AND btrim(sport) <> ''
  AND team_name IS NOT NULL
  AND left(team_name, length(sport)) IS DISTINCT FROM sport;

UPDATE results
SET team_name = trim(sport || ' ' || team_name)
WHERE sport IS NOT NULL
  AND btrim(sport) <> ''
  AND team_name IS NOT NULL
  AND left(team_name, length(sport)) IS DISTINCT FROM sport;
