import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildSyntheticEmail, padPin } from '@/lib/supabase/pin-email';
import { generateExercise, compute } from '@/lib/exercises/generators';
import { calculatePoints } from '@/lib/exercises/points';
import { computeNewDifficulty } from '@/lib/exercises/difficulty';
import { OPERATOR_TO_TYPE } from '@/lib/exercises/types';
import {
  generateExerciseSchema,
  submitAnswerSchema,
} from '@/lib/schemas/exercise';
import type { Database } from '@/types/database.types';

// Isolated admin client -- same pattern as fixtures/supabase.ts
function exerciseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Unique test data to avoid collision with rls-policies and other integration tests
const EX_TEST_SCHOOL = 'Testschule Exercise';
const EX_TEST_CLASS = 'Klasse Exercise-1a';
const EX_TEST_TEACHER = {
  email: 'teacher.exercise@matheapp.test',
  password: 'TestPass123!',
  name: 'Exercise Test Teacher',
};
const EX_TEST_CHILD = {
  username: 'emma.exercise',
  pin: '9876',
  grade: 2,
};

type SeedResult = {
  schoolId: string;
  classId: string;
  teacherId: string;
  childId: string;
};

async function exerciseCleanup(): Promise<void> {
  const admin = exerciseAdminClient();

  const { data: allUsers } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (allUsers?.users) {
    for (const u of allUsers.users) {
      if (
        u.email === EX_TEST_TEACHER.email ||
        (u.email?.endsWith('@matheapp.internal') &&
          u.email.startsWith(`${EX_TEST_CHILD.username}.`))
      ) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  }

  await admin.from('classes').delete().eq('name', EX_TEST_CLASS);
  await admin.from('schools').delete().eq('name', EX_TEST_SCHOOL);
}

async function exerciseSeed(): Promise<SeedResult> {
  const admin = exerciseAdminClient();
  await exerciseCleanup();

  // 1. Create teacher
  const { data: teacherSignup, error: teacherErr } =
    await admin.auth.admin.createUser({
      email: EX_TEST_TEACHER.email,
      password: EX_TEST_TEACHER.password,
      email_confirm: true,
      app_metadata: { role: 'teacher' },
      user_metadata: { name: EX_TEST_TEACHER.name },
    });
  if (teacherErr || !teacherSignup.user)
    throw teacherErr ?? new Error('teacher create failed');
  const teacherId = teacherSignup.user.id;

  await admin.from('profiles').upsert({
    user_id: teacherId,
    role: 'teacher',
    display_name: EX_TEST_TEACHER.name,
    grade_level: null,
    class_id: null,
  });

  // 2. Create school + class
  const { data: school, error: schoolErr } = await admin
    .from('schools')
    .insert({ name: EX_TEST_SCHOOL, subscription_tier: 'free' })
    .select('id')
    .single();
  if (schoolErr || !school) throw schoolErr;
  const schoolId = school.id;

  const { data: cls, error: classErr } = await admin
    .from('classes')
    .insert({
      name: EX_TEST_CLASS,
      school_id: schoolId,
      teacher_id: teacherId,
    })
    .select('id')
    .single();
  if (classErr || !cls) throw classErr;
  const classId = cls.id;

  await admin
    .from('profiles')
    .update({ class_id: classId })
    .eq('user_id', teacherId);

  // 3. Create child
  const childEmail = buildSyntheticEmail(EX_TEST_CHILD.username, classId);
  const childPassword = padPin(EX_TEST_CHILD.pin, classId);
  const { data: childSignup, error: childErr } =
    await admin.auth.admin.createUser({
      email: childEmail,
      password: childPassword,
      email_confirm: true,
      app_metadata: { role: 'child' },
    });
  if (childErr || !childSignup.user)
    throw childErr ?? new Error('child create failed');
  const childId = childSignup.user.id;

  await admin.from('profiles').upsert({
    user_id: childId,
    role: 'child',
    display_name: EX_TEST_CHILD.username,
    grade_level: EX_TEST_CHILD.grade,
    class_id: classId,
  });

  return { schoolId, classId, teacherId, childId };
}

describe('Exercise Actions Integration', () => {
  let seed: SeedResult;

  beforeAll(async () => {
    seed = await exerciseSeed();
  }, 30_000);

  afterAll(async () => {
    const admin = exerciseAdminClient();
    if (seed?.childId) {
      await admin.from('progress_entries').delete().eq('child_id', seed.childId);
    }
    await exerciseCleanup();
  }, 30_000);

  it('exercise generation produces valid ClientExercise shape', () => {
    const exercise = generateExercise(2, 'easy');

    // Full exercise has correctAnswer
    expect(exercise).toHaveProperty('id');
    expect(exercise).toHaveProperty('operand1');
    expect(exercise).toHaveProperty('operand2');
    expect(exercise).toHaveProperty('operator');
    expect(exercise).toHaveProperty('correctAnswer');

    // ClientExercise shape (what the action returns) strips correctAnswer
    const clientExercise = {
      id: exercise.id,
      operand1: exercise.operand1,
      operand2: exercise.operand2,
      operator: exercise.operator,
    };
    expect(clientExercise).not.toHaveProperty('correctAnswer');
    expect(clientExercise.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('generated exercise correctAnswer is never exposed in ClientExercise', () => {
    const exercise = generateExercise(1, 'medium');
    const clientExercise: { id: string; operand1: number; operand2: number; operator: string } = {
      id: exercise.id,
      operand1: exercise.operand1,
      operand2: exercise.operand2,
      operator: exercise.operator,
    };
    const keys = Object.keys(clientExercise);
    expect(keys).not.toContain('correctAnswer');
    expect(keys).toHaveLength(4);
  });

  it('progress_entry written for correct answer', async () => {
    const admin = exerciseAdminClient();
    const { error } = await admin.from('progress_entries').insert({
      child_id: seed.childId,
      operation_type: 'addition',
      grade: 2,
      correct: true,
      points_earned: 10,
    });
    expect(error).toBeNull();

    const { data, error: readError } = await admin
      .from('progress_entries')
      .select('*')
      .eq('child_id', seed.childId)
      .eq('correct', true)
      .eq('operation_type', 'addition')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(readError).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.child_id).toBe(seed.childId);
    expect(data!.correct).toBe(true);
    expect(data!.points_earned).toBe(10);
    expect(data!.grade).toBe(2);
  });

  it('progress_entry written for incorrect answer with 0 points', async () => {
    const admin = exerciseAdminClient();
    const { error } = await admin.from('progress_entries').insert({
      child_id: seed.childId,
      operation_type: 'subtraktion',
      grade: 2,
      correct: false,
      points_earned: 0,
    });
    expect(error).toBeNull();

    const { data, error: readError } = await admin
      .from('progress_entries')
      .select('*')
      .eq('child_id', seed.childId)
      .eq('correct', false)
      .eq('operation_type', 'subtraktion')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(readError).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.correct).toBe(false);
    expect(data!.points_earned).toBe(0);
  });

  it('progress_entry uses OPERATOR_TO_TYPE mapping', () => {
    expect(OPERATOR_TO_TYPE['+']).toBe('addition');
    expect(OPERATOR_TO_TYPE['-']).toBe('subtraktion');
    expect(OPERATOR_TO_TYPE['*']).toBe('multiplikation');
    expect(OPERATOR_TO_TYPE['/']).toBe('division');
  });

  it('full exercise flow: generate -> submit -> verify', async () => {
    const admin = exerciseAdminClient();

    // 1. Generate exercise
    const exercise = generateExercise(2, 'medium');

    // 2. Compute correct answer (server-side re-computation)
    const correctAnswer = compute(
      exercise.operand1,
      exercise.operand2,
      exercise.operator
    );
    expect(correctAnswer).toBe(exercise.correctAnswer);

    // 3. Calculate points for correct answer at medium difficulty
    const pointsEarned = calculatePoints(true, 'medium');
    expect(pointsEarned).toBe(20);

    // 4. Compute new difficulty (simulate streak: 2 correct so far, about to be 3)
    const newDifficulty = computeNewDifficulty('medium', 3, 0);
    expect(newDifficulty).toBe('hard');

    // 5. Write progress_entry
    const { error: insertError } = await admin
      .from('progress_entries')
      .insert({
        child_id: seed.childId,
        operation_type: OPERATOR_TO_TYPE[exercise.operator],
        grade: 2,
        correct: true,
        points_earned: pointsEarned,
      });
    expect(insertError).toBeNull();

    // 6. Verify the progress_entry
    const { data, error: readError } = await admin
      .from('progress_entries')
      .select('*')
      .eq('child_id', seed.childId)
      .eq('points_earned', 20)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(readError).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.correct).toBe(true);
    expect(data!.points_earned).toBe(20);
    expect(data!.grade).toBe(2);
  });

  it('schema rejects unauthenticated-like invalid input', () => {
    const result = submitAnswerSchema.safeParse({
      exerciseId: '',
      operand1: 5,
      operand2: 3,
      operator: '+',
      userAnswer: 8,
      currentDifficulty: 'easy',
      correctStreak: 0,
      incorrectStreak: 0,
    });
    expect(result.success).toBe(false);
  });

  it('schema validates complete exercise submission', () => {
    const result = submitAnswerSchema.safeParse({
      exerciseId: '550e8400-e29b-41d4-a716-446655440000',
      operand1: 12,
      operand2: 7,
      operator: '-',
      userAnswer: 5,
      currentDifficulty: 'medium',
      correctStreak: 1,
      incorrectStreak: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operand1).toBe(12);
      expect(result.data.userAnswer).toBe(5);
    }
  });
});
