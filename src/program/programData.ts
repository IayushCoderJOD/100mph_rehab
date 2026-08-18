import { useMemo } from 'react';
import {
  Exercise,
  LearnContent,
  Program,
  ProgressionLevel,
  ScheduleMap,
  SessionExercise,
  SessionType,
  SignatureExercise,
  mock,
} from '@/data';
import { useProgram } from './ProgramProvider';

/** Everything a screen needs to render one program. */
export type ProgramData = {
  program: Program;
  sessionTypes: SessionType[];
  exercises: Exercise[];
  sessionExercises: SessionExercise[];
  defaultSchedule: ScheduleMap;
  signatureExercise: SignatureExercise;
  progressionLevels: ProgressionLevel[];
  learnContent: LearnContent[];
};

/**
 * The single seam between "which program the user is on" and "what the app
 * shows". Every program returns the same content for now — only the program
 * record itself differs. When knee, shoulder and the rest get their own
 * sessions and lessons, this function is the only thing that changes: screens
 * and components already ask for their content by program id.
 */
export function getProgramData(programId: string | null): ProgramData {
  const program = mock.programs.find((p) => p.id === programId) ?? mock.programs[0];

  return {
    program,
    sessionTypes: mock.sessionTypes,
    exercises: mock.exercises,
    sessionExercises: mock.sessionExercises,
    defaultSchedule: mock.defaultSchedule,
    signatureExercise: mock.signatureExercise,
    progressionLevels: mock.progressionLevels,
    learnContent: mock.learnContent,
  };
}

export function useProgramData(): ProgramData {
  const { programId } = useProgram();
  return useMemo(() => getProgramData(programId), [programId]);
}
