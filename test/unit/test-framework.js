/**
 * Simple test framework for unit tests
 */

let currentSuite = null;
let testResults = [];

export function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    beforeEach: null,
    afterEach: null
  };
  
  const oldSuite = currentSuite;
  currentSuite = suite;
  
  fn();
  
  currentSuite = oldSuite;
  
  if (!oldSuite) {
    // Top-level suite - run tests
    runSuite(suite);
  } else {
    oldSuite.tests.push(suite);
  }
}

export function it(name, fn) {
  if (!currentSuite) {
    throw new Error('it() must be called inside describe()');
  }
  
  currentSuite.tests.push({ name, fn, type: 'test' });
}

export function beforeEach(fn) {
  if (!currentSuite) {
    throw new Error('beforeEach() must be called inside describe()');
  }
  currentSuite.beforeEach = fn;
}

export function afterEach(fn) {
  if (!currentSuite) {
    throw new Error('afterEach() must be called inside describe()');
  }
  currentSuite.afterEach = fn;
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    }
  };
}

async function runSuite(suite) {
  console.log(`\n${suite.name}`);
  console.log('='.repeat(suite.name.length));
  
  for (const test of suite.tests) {
    if (test.type === 'test') {
      await runTest(suite, test);
    } else {
      await runSuite(test);
    }
  }
  
  printResults();
}

async function runTest(suite, test) {
  try {
    if (suite.beforeEach) {
      await suite.beforeEach();
    }
    
    await test.fn();
    
    if (suite.afterEach) {
      await suite.afterEach();
    }
    
    testResults.push({ suite: suite.name, test: test.name, passed: true });
    console.log(`  ✓ ${test.name}`);
  } catch (error) {
    testResults.push({ suite: suite.name, test: test.name, passed: false, error: error.message });
    console.log(`  ✗ ${test.name}`);
    console.log(`    ${error.message}`);
  }
}

function printResults() {
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed, ${total} total`);
  console.log('='.repeat(50));
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.suite} > ${r.test}: ${r.error}`);
    });
    process.exit(1);
  }
}

// Export jest-like mock function for compatibility
export const jest = {
  fn: (impl) => {
    const fn = (...args) => {
      fn.mock.calls.push(args);
      return impl ? impl(...args) : undefined;
    };
    fn.mock = { calls: [] };
    return fn;
  },
  requireActual: (module) => {
    // Simple implementation - in real use, would use actual require
    return {};
  }
};
