import { z } from 'zod'

export const EnvSchema = z.object({
  TEST_RESULTS: z.string().default('./test-results'),
})

export const env = EnvSchema.parse(process.env)

export const ResultSchema = z.object({
  status: z.enum(['passed', 'timedOut', 'failed', 'skipped', 'interrupted']),
  duration: z.number(),
  startTime: z.string(),
})

export const TestAnnotationSchema = z.object({
  type: z.string(),
  description: z.string(),
})

export const TestSchema = z.object({
  results: z.array(ResultSchema),
  annotations: z.array(TestAnnotationSchema).optional(),
  status: z.enum(['expected', 'unexpected', 'flaky', 'skipped']),
})

export type Result = z.infer<typeof ResultSchema>

export const SpecSchema = z.object({
  title: z.string(),
  ok: z.boolean(),
  tests: z.array(TestSchema),
})

export const SuiteInnerSchema = z.object({
  title: z.string(),
  specs: z.array(SpecSchema),
})

export const SuiteSchema = z.object({
  title: z.string(),
  specs: z.array(SpecSchema),
  suites: z.array(SuiteInnerSchema).optional(),
})

export const ResultsJsonSchema = z.object({
  suites: z.array(SuiteSchema),
})

export type TestResult = {
  analyzedResults: number
  totalDurationMs: number

  failed: number
  testFailedByTitle: Record<string, number>
  testFlakyByTitle: Record<string, number>
  testCountByTitle: Record<string, number>

  /**
   * A single test
   */
  testTotal: number
  testTotalByStatus: Record<string, number>
  testTotalByStatusWithPercent: Record<
    string,
    { count: number; percent: string }
  >

  /**
   * A single test can contain multiple results
   * e.g. when the first try fails and the second passes
   */
  testResultsTotal: number
  testResultsByStatus: Record<string, number>
  testResultsByStatusWithPercent: Record<
    string,
    { count: number; percent: string }
  >

  minCpuUsed: number
  maxCpuUsed: number

  cpuUsedInPercentage: number

  minMemoryUsedInPercentage: number
  maxMemoryUsedInPercentage: number

  memoryUsedInPercentage: number

  minMemoryUsedInMB: number
  maxMemoryUsedInMB: number

  memoryUsedInMB: number
}
