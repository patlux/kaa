import { readdir } from 'fs/promises'
import path, { resolve } from 'path'
import fs from 'fs'
import fsAsync from 'fs/promises'
import { Result, ResultsJsonSchema, TestResult } from './schema'

import { OSUsage } from '../src/reporters/performance'

const byPercent = (results: Record<string, number>, total: number) => {
  return Object.keys(results).reduce<
    Record<string, { count: number; percent: string }>
  >((acc, name) => {
    return {
      ...acc,
      [name]: {
        count: results[name],
        percent: `${Math.round((results[name] / total) * 100)}%`,
      },
    }
  }, {})
}

async function* findResultsJsonFiles(dir: string): AsyncGenerator<string> {
  const dirents = await readdir(dir, { withFileTypes: true })
  console.log(dirents)
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      console.log(res)
      yield* findResultsJsonFiles(res)
    } else {
      console.log(res)
      if (res.endsWith('/results.json')) {
        yield res
      }
    }
  }
}

export const collect = async (folder: string): Promise<TestResult> => {
  const testResult: TestResult = {
    analyzedResults: 0,

    failed: 0,

    testTotal: 0,
    testTotalByStatus: {},
    testTotalByStatusWithPercent: {},

    testResultsTotal: 0,
    testResultsByStatus: {},
    testResultsByStatusWithPercent: {},

    testFailedByTitle: {},
    testFlakyByTitle: {},
    testCountByTitle: {},

    totalDurationMs: 0,

    minCpuUsed: 0,
    maxCpuUsed: 0,

    cpuUsedInPercentage: 0,

    minMemoryUsedInPercentage: 0,
    maxMemoryUsedInPercentage: 0,

    memoryUsedInPercentage: 0,

    minMemoryUsedInMB: 0,
    maxMemoryUsedInMB: 0,

    memoryUsedInMB: 0,
  }

  const folder2 = folder.startsWith('/')
    ? folder
    : path.join(process.cwd(), folder)
  console.log('DIR', folder2)

  for await (const resultsJsonPath of findResultsJsonFiles(folder2)) {
    const content = await fsAsync.readFile(resultsJsonPath, {
      encoding: 'utf8',
    })
    const result = ResultsJsonSchema.parse(JSON.parse(content))

    let testResultDurationMs = 0

    const results: Result[] = []
    const folderPath = resultsJsonPath.substring(
      0,
      resultsJsonPath.indexOf('results.json'),
    )
    const performanceFilePath = path.join(folderPath, 'performance.json')
    const performanceFile = fs.existsSync(performanceFilePath)

    if (performanceFile) {
      const performanceFile = await fsAsync.readFile(performanceFilePath, {
        encoding: 'utf8',
      })
      const { osUsage }: { osUsage: OSUsage } = JSON.parse(performanceFile)

      const minMemoryUsePercentage = Math.min(
        ...osUsage.memory.map(m => m.freePercentage),
      )
      const maxMemoryUsePercentage = Math.max(
        ...osUsage.memory.map(m => m.freePercentage),
      )
      // const firstMemoryUsePercentage = osUsage.memory[0].freePercentage
      // const lastMemoryUsePercentage =
      osUsage.memory[osUsage.memory.length - 1].freePercentage
      const minMemoryTotalUse = Math.min(
        ...osUsage.memory.map(m => m.freeTotal),
      )
      const maxMemoryTotalUse = Math.max(
        ...osUsage.memory.map(m => m.freeTotal),
      )
      // const firstMemoryTotalUse = osUsage.memory[0].freeTotal
      // const lastMemoryTotalUse =
      osUsage.memory[osUsage.memory.length - 1].freeTotal
      // console.log({
      //   firstMemoryUsePercentage,
      //   firstMemoryTotalUse,
      //   lastMemoryUsePercentage,
      //   lastMemoryTotalUse,
      //   minMemoryUsePercentage,
      //   maxMemoryUsePercentage,
      //   minMemoryTotalUse,
      //   maxMemoryTotalUse,
      // })

      testResult.minMemoryUsedInPercentage =
        testResult.minMemoryUsedInPercentage === 0
          ? minMemoryUsePercentage
          : Math.min(
            minMemoryUsePercentage,
            testResult.minMemoryUsedInPercentage,
          )
      testResult.maxMemoryUsedInPercentage =
        testResult.maxMemoryUsedInPercentage === 0
          ? maxMemoryUsePercentage
          : Math.max(
            maxMemoryUsePercentage,
            testResult.maxMemoryUsedInPercentage,
          )
      testResult.minMemoryUsedInMB =
        testResult.minMemoryUsedInMB === 0
          ? minMemoryTotalUse
          : Math.min(minMemoryTotalUse, testResult.minMemoryUsedInMB)
      testResult.maxMemoryUsedInMB =
        testResult.maxMemoryUsedInMB === 0
          ? maxMemoryTotalUse
          : Math.max(maxMemoryTotalUse, testResult.maxMemoryUsedInMB)

      const minCpuUse = Math.min(...osUsage.cpu.map(m => m.loadAvg[2]))
      const maxCpuUse = Math.max(...osUsage.cpu.map(m => m.loadAvg[2]))
      testResult.minCpuUsed =
        testResult.minCpuUsed === 0
          ? minCpuUse
          : Math.min(minCpuUse, testResult.minCpuUsed)
      testResult.maxCpuUsed =
        testResult.maxCpuUsed === 0
          ? maxCpuUse
          : Math.max(maxCpuUse, testResult.maxCpuUsed)
    }

    // console.log(`\n${testResultDir}`, '---------------------')
    for (const suite of result.suites) {
      let suiteDurationMs = 0

      const suiteSpecs =
        suite.suites
          ?.map(s =>
            s.specs.map(spec => {
              return {
                ...spec,
                title: `${s.title} - ${spec.title}`,
              }
            }),
          )
          .flat() ?? []
      const specs = suite.specs
      const specsAll = [...suiteSpecs, ...specs]

      for (const spec of specsAll) {
        let specDurationMs = 0

        testResult.testCountByTitle[spec.title] ??= 0
        testResult.testCountByTitle[spec.title]++

        if (!spec.ok) {
          testResult.failed++
          testResult.testFailedByTitle[spec.title] ??= 0
          testResult.testFailedByTitle[spec.title]++
        }

        if (spec.ok && spec.tests.every(test => test.status === 'flaky')) {
          testResult.testFlakyByTitle[spec.title] ??= 0
          testResult.testFlakyByTitle[spec.title]++
        }

        for (const test of spec.tests) {
          let testDurationMs = 0

          testResult.testTotal += 1
          testResult.testTotalByStatus[test.status] ??= 0
          testResult.testTotalByStatus[test.status] =
            testResult.testTotalByStatus[test.status] + 1

          for (const result of test.results) {
            results.push(result)
            testDurationMs += result.duration
          }

          specDurationMs += testDurationMs
        }

        // console.log('- -', spec.title, specDurationMs)
        suiteDurationMs += specDurationMs
      }

      // console.log('-', suite.title, suiteDurationMs)

      testResultDurationMs += suiteDurationMs
    }

    // console.log(`${testResultDir}`, testResultDurationMs)
    testResult.totalDurationMs += testResultDurationMs
    testResult.testResultsTotal += results.length

    for (const result of results) {
      testResult.testResultsByStatus[result.status] ??= 0
      testResult.testResultsByStatus[result.status] =
        testResult.testResultsByStatus[result.status] + 1
    }

    testResult.analyzedResults += 1
  }

  testResult.testTotalByStatusWithPercent = byPercent(
    testResult.testTotalByStatus,
    testResult.testTotal,
  )
  testResult.testResultsByStatusWithPercent = byPercent(
    testResult.testResultsByStatus,
    testResult.testResultsTotal,
  )

  testResult.memoryUsedInPercentage =
    (testResult.maxMemoryUsedInPercentage -
      testResult.minMemoryUsedInPercentage) *
    100
  testResult.memoryUsedInMB =
    testResult.maxMemoryUsedInMB - testResult.minMemoryUsedInMB

  testResult.cpuUsedInPercentage =
    (testResult.minCpuUsed / testResult.maxCpuUsed) * 100

  return testResult
}
