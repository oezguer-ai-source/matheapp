/**
 * Teacher Query Aggregation Tests
 *
 * Die Aggregationslogik (fetchClassOverview, fetchOperationAccuracy) ist eng
 * mit dem Supabase-Client verwoben und laesst sich nicht ohne signifikantes
 * Refactoring in pure Funktionen extrahieren.
 *
 * Die korrekte Aggregation wird stattdessen durch die Integration-Tests
 * in tests/integration/teacher-dashboard.test.ts abgedeckt:
 * - Test 1: exerciseCount, correctCount, accuracy, totalPoints
 * - Test 2: Operation-Genauigkeit pro Rechenart
 *
 * Covered by integration tests.
 */
