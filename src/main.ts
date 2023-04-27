import { collect } from './collect'
import { env, TestResult } from './schema'

/**
 * To run this file, please install bun.sh
 *
 * curl -fsSL https://bun.sh/install | bash
 *
 * Then you can run this file as the following examples
 *
 * # Default folder: ./test-results
 * node --loader esbuild-register/loader -r esbuild-register tools/main.ts
 *
 * Or specify another folder
 * TEST_RESULTS=./test-results/tests-1 node --loader esbuild-register/loader -r esbuild-register tools/main.ts
 * TEST_RESULTS=./test-results/tests-2 node --loader esbuild-register/loader -r esbuild-register tools/main.ts
 * TEST_RESULTS=./test-results/tests-3 node --loader esbuild-register/loader -r esbuild-register tools/main.ts
 *
 */

const main = async () => {
  const result: TestResult = await collect(env.TEST_RESULTS)

  const {
    analyzedResults,
    totalDurationMs,
    testResultsTotal,
    testTotalByStatusWithPercent,
    // testResultsByStatusWithPercent,
    testTotal,
    testFailedByTitle,
    testFlakyByTitle,
    testCountByTitle,
    failed,
    minMemoryUsedInPercentage,
    maxMemoryUsedInPercentage,
    memoryUsedInPercentage,
    minMemoryUsedInMB,
    maxMemoryUsedInMB,
    memoryUsedInMB,
    cpuUsedInPercentage,
    minCpuUsed,
    maxCpuUsed,
  } = result

  console.log({
    analyzedResults,
    totalDurationHours: Math.floor(totalDurationMs / 1000 / 60 / 60),
    testTotal,

    testTotalByStatusWithPercent,
    // testResultsByStatusWithPercent,

    failed,
    testFailedByTitle,
    testFlakyByTitle,
    testCountByTitle,

    testNotFailedAndNotFlaky: Object.keys(testCountByTitle).reduce(
      (acc, title) => {
        if (testFailedByTitle[title]) {
          return acc
        }
        if (testFlakyByTitle[title]) {
          return acc
        }
        return {
          ...acc,
          [title]: 0,
        }
      },
      {},
    ),

    perTestSeconds: totalDurationMs / testResultsTotal / 1000,

    memoryUsedInPercentage: `${memoryUsedInPercentage.toFixed(2)}%`,
    memoryUsedInMB: `${(memoryUsedInMB / 1024).toFixed(2)} GB`,
    cpuUsedInPercentage: `${cpuUsedInPercentage.toFixed(2)} %`,

    minMemoryUsedInPercentage,
    maxMemoryUsedInPercentage,

    minMemoryUsedInMB,
    maxMemoryUsedInMB,

    minCpuUsed,
    maxCpuUsed,
  })
}

main()
