#!/usr/bin/env node
//
// Writes the backend's static catalogue from this app's own mock.ts.
//
// The README promises that the content the API serves and the content the app
// was built against are the same file by construction. This is the construction:
// mock.ts is the one place exercises, routines and lessons are authored, and
// the backend reads a JSON projection of it at boot. Run it after any content
// change, commit both sides together.
//
//   node scripts/export-catalogue.mjs [OUT_FILE]
//
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(
  process.argv[2] ?? join(root, '..', '100mph_backend', 'src', 'main', 'resources', 'content', 'catalogue.json')
);

// mock.ts only imports types, which transpilation erases, so it loads as a
// plain CommonJS module with no bundler in the way.
const source = readFileSync(join(root, 'src', 'data', 'mock.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const scratch = mkdtempSync(join(tmpdir(), 'catalogue-'));
const compiled = join(scratch, 'mock.cjs');
writeFileSync(compiled, outputText);
const mock = require(compiled);

// The API's exercise library is seeded from these. Each carries the sets a
// coach starts from; the drafts arrive unfilmed, for an admin to finish.
const withSets = (exercise) => ({
  ...exercise,
  suggested_sets: mock.suggestedSets[exercise.id] ?? null,
  hidden: false,
});

const catalogue = {
  programs: mock.programs,
  learn_topics: mock.humanBodyTopics,
  session_types: mock.sessionTypes,
  exercises: mock.exercises.map(withSets),
  draft_exercises: mock.draftExercises.map(withSets),
  session_exercises: mock.sessionExercises,
  signature_exercises: [mock.signatureExercise],
  progression_levels: mock.progressionLevels,
  learn_content: mock.learnContent,
  // The seed week is a per-user row in the app; the catalogue keeps only the
  // template part of it.
  default_schedule: mock.weeklySchedule.map(({ program_id, day_of_week, session_type_id }) => ({
    program_id,
    day_of_week,
    session_type_id,
  })),
  routines: mock.routines,
};

// A routine pointing at an exercise that does not exist would only surface as
// a blank row on someone's phone. Refuse to write it.
const exerciseIds = new Set(catalogue.exercises.map((e) => e.id));
for (const routine of catalogue.routines) {
  for (const line of routine.exercises) {
    if (!exerciseIds.has(line.exercise_id)) {
      console.error(`error: routine ${routine.id} references unknown exercise ${line.exercise_id}`);
      process.exit(1);
    }
  }
}

writeFileSync(out, JSON.stringify(catalogue, null, 2) + '\n');
console.log(
  `Wrote ${out}: ${catalogue.exercises.length} exercises, ${catalogue.routines.length} routines, ` +
    `${catalogue.draft_exercises.length} drafts, ${catalogue.learn_content.length} lessons`
);
