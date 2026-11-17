# Phase 2: Performance Metrics Implementation

## Overview
This phase adds comprehensive performance metrics to GhostSpec CLI's real fast-check test execution. The implementation provides detailed insights into test execution performance, parallelization effectiveness, and throughput.

## Features Added

### 1. Performance Metrics Interface
Added a new `PerformanceMetrics` interface in `src/utils/realTestRunner.ts` with the following fields:
- `totalDuration`: Total test execution time in milliseconds
- `avgDuration`: Average duration per test in milliseconds
- `minDuration`: Minimum test duration in milliseconds
- `maxDuration`: Maximum test duration in milliseconds
- `durationStdDev`: Standard deviation of test durations in milliseconds
- `totalRuns`: Total number of property test runs
- `runsPerSecond`: Number of property runs per second
- `testsPerSecond`: Number of tests completed per second
- `speedupFactor`: Speedup achieved through parallelization (if parallel execution)
- `efficiency`: Efficiency percentage of parallelization

### 2. Performance Metrics Calculation
Implemented `calculatePerformanceMetrics()` function that:
- Computes basic statistics (avg, min, max, std dev) from test durations
- Calculates runs per second based on total runs and duration
- Calculates tests per second based on number of tests and duration
- Estimates speedup factor by comparing sequential time estimate vs actual parallel time
- Computes efficiency as (speedupFactor / numTests) * 100

### 3. CLI Integration
- Added `--num-runs <n>` option to control the number of iterations per property (default: 100)
- Enhanced `--parallel` / `-p` flag to support values: `--parallel true`, `--parallel false`, or just `--parallel`
- Added `--no-parallel` flag to explicitly disable parallel execution
- Performance metrics are automatically displayed in test output

### 4. Enhanced Test Output
Updated `formatRealTestResults()` to display performance metrics section:
```
=== Performance Metrics ===
Average Duration: Xms
Min Duration: Xms
Max Duration: Xms
Std Dev: Xms
Runs/Second: X
Tests/Second: X
Speedup Factor: Xx (only shown for parallel execution)
Efficiency: X% (only shown for parallel execution)
Parallel: Yes (max X) (only shown for parallel execution)
```

## Usage Examples

### Run with 100 iterations (default):
```bash
ghostspec run spec.md --real
```

### Run with custom iterations:
```bash
ghostspec run spec.md --real --num-runs 500
```

### Run with parallel execution (default):
```bash
ghostspec run spec.md --real --num-runs 1000 --parallel
```

### Run with sequential execution:
```bash
ghostspec run spec.md --real --num-runs 1000 --no-parallel
```

### Run with explicit parallel flag:
```bash
ghostspec run spec.md --real --num-runs 1000 --parallel true
```

## Technical Details

### Parallel Execution
- Tests are executed in batches with configurable concurrency (default: min(numTests, 4))
- The speedup factor compares the sum of individual test durations vs actual parallel execution time
- Efficiency measures how effectively parallelization is utilized

### Metrics Calculation
```typescript
// Basic statistics
const avg = sum(durations) / durations.length
const min = Math.min(...durations)
const max = Math.max(...durations)
const stdDev = Math.sqrt(variance)

// Throughput
const runsPerSecond = totalRuns / (totalDuration / 1000)
const testsPerSecond = durations.length / (totalDuration / 1000)

// Parallel metrics
const sequentialTimeEstimate = sum(durations)
const speedupFactor = sequentialTimeEstimate / totalDuration
const efficiency = (speedupFactor / durations.length) * 100
```

## Files Modified

1. **src/utils/realTestRunner.ts**
   - Added `PerformanceMetrics` interface
   - Added `calculatePerformanceMetrics()` function
   - Updated `runRealTests()` to calculate and return metrics
   - Updated `formatRealTestResults()` to display performance metrics
   - Updated `TestSuiteResult` interface to include `metrics` field

2. **dist/cli.js**
   - Added `--num-runs` option parsing
   - Enhanced `--parallel` flag to support values
   - Added `--no-parallel` flag support
   - Updated `runWithRealOutput()` to pass `numRuns` to real test runner

3. **dist/utils/realTestRunner.js**
   - Compiled version with all performance metrics features

## Testing

All performance metrics have been tested with various configurations:
- Sequential execution: Shows basic metrics (duration, runs/sec, tests/sec)
- Parallel execution: Shows full metrics including speedup factor and efficiency
- Different test counts: Metrics scale appropriately
- Different iteration counts: Runs/second and totalRuns reflect the configuration

## Future Enhancements

Potential improvements for future phases:
- Add baseline comparison metrics
- Add historical performance tracking
- Add visualization options for metrics
- Add memory usage metrics
- Add CPU usage metrics
- Add support for custom metrics via plugins
