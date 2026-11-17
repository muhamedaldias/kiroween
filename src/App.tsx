import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseSpec, validateSpec, type ParseError } from "./core/spec";
import { generateTests, type GeneratedTest } from "./core/generate";
import { runGeneratedTests, formatTestResults, getGhostErrors } from "./utils/testRunner";
import SpecHistory from "./components/SpecHistory";
import GhostVisualization from "./components/GhostVisualization";

// Sound effects (placeholder - would need actual audio files)
const playGhostSound = () => {
  // In production: new Audio('/sounds/ghost.mp3').play().catch(() => {});
};

// Animation variants
const float = {
  animate: {
    y: [0, -5, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  }
};

// Maximum input length to prevent DoS
const MAX_INPUT_LENGTH = 50000;

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format error for display
function formatError(error: ParseError): string {
  return `[Line ${error.line}] ${error.message}`;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// Ghost animation component
function GhostIcon({ className = "" }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M12 2a8 8 0 0 0-4 15.5A6 6 0 0 0 12 22a6 6 0 0 0 4-4.5A8 8 0 0 0 12 2Z" />
      <circle cx="9" cy="9" r="1.5" />
      <circle cx="15" cy="9" r="1.5" />
      <path d="M12 16v4" />
    </motion.svg>
  );
}

// Error display component
function ErrorDisplay({ errors }: { errors: ParseError[] }) {
  if (errors.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg"
    >
      <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        Errors ({errors.length})
      </h3>
      <ul className="list-disc list-inside text-red-300 space-y-1">
        {errors.slice(0, 5).map((error, index) => (
          <li key={index}>{formatError(error)}</li>
        ))}
        {errors.length > 5 && (
          <li className="text-red-400">... and {errors.length - 5} more errors</li>
        )}
      </ul>
    </motion.div>
  );
}

// Warning display component
function WarningDisplay({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg"
    >
      <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Warnings ({warnings.length})
      </h3>
      <ul className="list-disc list-inside text-yellow-300 space-y-1">
        {warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
    </motion.div>
  );
}

// Stats display component
function StatsDisplay({ 
  specName, 
  propertyCount, 
  framework 
}: { 
  specName: string; 
  propertyCount: number; 
  framework: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex gap-4 text-sm text-gray-400 mb-4"
    >
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Spec: {specName || "Unnamed"}
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7l8-4 8 4M12 11v10" />
        </svg>
        Properties: {propertyCount}
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Framework: {framework}
      </span>
    </motion.div>
  );
}

export default function App() {
  const [specText, setSpecText] = useState<string>("# spec: MySpec\n\n# Properties:\n- property addCommutative(a, b): a + b == b + a\n- property noEmptyString: invariant(input) -> input.length >= 0");
  const [generatedTests, setGeneratedTests] = useState<GeneratedTest | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"spec" | "tests">("spec");
  const [testResults, setTestResults] = useState<string>("");
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [showGhost, setShowGhost] = useState<boolean>(false);
  const [ghostErrors, setGhostErrors] = useState<{
    testName: string;
    message: string;
    input: unknown;
    expected: unknown;
    actual: unknown;
  }[]>([]);
  const ghostTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup ghost timer on unmount
  useEffect(() => {
    return () => {
      if (ghostTimerRef.current) {
        clearTimeout(ghostTimerRef.current);
      }
    };
  }, []);

  // Trigger ghost animation when tests are generated
  useEffect(() => {
    if (generatedTests) {
      playGhostSound();
      
      if (ghostTimerRef.current) {
        clearTimeout(ghostTimerRef.current);
      }
      
      // Use requestAnimationFrame to avoid setState in effect warning
      requestAnimationFrame(() => {
        setShowGhost(true);
        ghostTimerRef.current = setTimeout(() => {
          setShowGhost(false);
        }, 3000);
      });
    }
  }, [generatedTests]);

  // Run tests in browser
  const handleRunTests = useCallback(async () => {
    if (!generatedTests || !specText) return;
    
    setIsRunningTests(true);
    setTestResults("Running tests...");
    setGhostErrors([]);
    
    try {
      // Run the generated tests
      const results = await runGeneratedTests(specText);
      
      // Format results for display
      const formattedResults = formatTestResults(results);
      setTestResults(formattedResults);
      
      // Get ghost errors for visualization
      if (results.failed > 0) {
        setGhostErrors(getGhostErrors(results));
      }
    } catch (error) {
      setTestResults(`Error running tests: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunningTests(false);
    }
  }, [generatedTests, specText]);

  // Parse spec with validation
  const { spec, errors, warnings } = useMemo(() => {
    try {
      const parsed = parseSpec(specText);
      const validation = validateSpec(parsed);
      
      return {
        spec: parsed,
        errors: validation.errors,
        warnings: parsed.errors?.filter(e => e.severity === "warning") || []
      };
    } catch (e) {
      return {
        spec: { name: "UnnamedSpec", properties: [] },
        errors: [{ line: 0, message: `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`, severity: "error" }],
        warnings: []
      };
    }
  }, [specText]);

  // Input validation
  const inputValidationError = useMemo(() => {
    if (!specText) return "Spec cannot be empty";
    if (specText.length > MAX_INPUT_LENGTH) {
      return `Spec exceeds maximum length of ${MAX_INPUT_LENGTH} characters`;
    }
    return null;
  }, [specText]);

  // Check if generation is allowed
  const canGenerate = useMemo(() => {
    return !inputValidationError && specText.length > 0 && !isGenerating;
  }, [inputValidationError, specText, isGenerating]);

  // Generate tests with debouncing
  const debouncedSpecText = useDebounce(specText, 500);
  
  // Auto-generate when spec changes (if valid)
  useState(() => {
    if (debouncedSpecText && debouncedSpecText !== specText) {
      // Skip - we'll handle it in the effect below
    }
  }, [debouncedSpecText, specText]);

  // Handle manual generation
  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    
    setIsGenerating(true);
    
    // Use requestAnimationFrame for smooth UI
    requestAnimationFrame(() => {
      try {
        const generated = generateTests(spec, { includeComments: true });
        const framework = generated.framework || "vitest";
        
        setGeneratedTests({
          code: generated.code,
          framework,
          propertiesCovered: spec.properties.length,
          warnings: generated.warnings || []
        });
      } catch (e) {
        console.error("Generation failed:", e);
      } finally {
        setIsGenerating(false);
      }
    });
  }, [canGenerate, spec]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!generatedTests) return;
    
    try {
      await navigator.clipboard.writeText(generatedTests.code);
      // Could add toast notification here
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [generatedTests]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!generatedTests) return;
    
    const blob = new Blob([generatedTests.code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spec.name || "tests"}.test.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedTests, spec.name]);

  // Sample specs for quick testing (reserved for future use)
  // const sampleSpecs = [
  //   {
  //     name: "String Utilities",
  //     content: `# spec: StringSpec
// 
// # String utility functions spec
// - property concatCommutative(a, b): roundtrip(a + b) -> b + a
// - property lengthNonNegative(s): invariant(s) -> s.length >= 0
// - property noCrashOnEmpty: no-crash("")`
  //   },
  //   {
  //     name: "Array Operations",
  //     content: `# spec: ArraySpec
// 
// # Array operations spec
// - property pushIncreasesLength(arr, item): invariant(arr, item) -> arr.push(item).length > arr.length
// - property concatPreservesOrder(a, b): roundtrip(a.concat(b))
// - property filterNoCrash(arr): no-crash(arr)`
  //   },
  //   {
  //     name: "Simple Example",
  //     content: `# spec: MySpec
// 
// # Basic properties
// - property alwaysTrue: invariant(input) -> true
// - property addCommutative(a, b): a + b == b + a`
  //   }
  // ];

  // Tab change handler
  const handleTabChange = useCallback((tab: "spec" | "tests") => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 relative"
      >
        {/* Floating ghosts in background */}
        <motion.div
          className="absolute -top-4 -right-8 text-purple-400/20"
          variants={float}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <GhostIcon className="w-8 h-8" />
        </motion.div>
        <motion.div
          className="absolute -top-2 -left-12 text-purple-400/20"
          variants={float}
          initial={{ opacity: 0, scale: 0.5, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ animationDelay: '0.5s' }}
        >
          <GhostIcon className="w-6 h-6" />
        </motion.div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 mb-2">
          GhostSpec
        </h1>
        <p className="text-gray-400 text-lg">
          Hauntingly good property-based test generation
        </p>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6"
        >
          <button
            onClick={() => handleTabChange("spec")}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === "spec"
                ? "bg-purple-700 text-white shadow-lg shadow-purple-900/50"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Spec
          </button>
          <button
            onClick={() => handleTabChange("tests")}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === "tests"
                ? "bg-purple-700 text-white shadow-lg shadow-purple-900/50"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Tests
          </button>
        </motion.div>

        {/* Error and Warning Displays */}
        <AnimatePresence mode="wait">
          {inputValidationError && (
            <ErrorDisplay errors={[{ line: 0, message: inputValidationError, severity: "error" }]} />
          )}
          {errors.length > 0 && !inputValidationError && (
            <ErrorDisplay errors={errors} />
          )}
          {warnings.length > 0 && (
            <WarningDisplay warnings={warnings.map(e => formatError(e))} />
          )}
        </AnimatePresence>

        {/* Stats */}
        {generatedTests && (
          <StatsDisplay
            specName={spec.name}
            propertyCount={spec.properties.length}
            framework={generatedTests.framework}
          />
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "spec" && (
            <motion.div
              key="spec"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 mb-6"
            >
              {/* Spec Editor */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-200">Spec Editor</h2>
                <div className="flex gap-2">
                  {/* Spec History Dropdown */}
                  <SpecHistory onLoadSpec={setSpecText} currentSpec={specText} />
                  
                  {/* Sample Specs Dropdown */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm flex items-center gap-2 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      Samples
                    </button>
                  </motion.div>
                  
                  {/* Generate Button */}
                  <motion.button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    whileHover={{ scale: !canGenerate ? 1 : 1.05 }}
                    whileTap={{ scale: !canGenerate ? 1 : 0.95 }}
                    className={`px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                      !canGenerate
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : isGenerating
                          ? "bg-purple-600 text-white cursor-wait"
                          : "bg-purple-700 hover:bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Generate Tests
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                className="w-full h-80 bg-gray-900 text-gray-200 p-4 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-900/50 outline-none transition-all duration-200 resize-none font-mono text-sm"
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
                placeholder="# spec: MySpec

# Properties:
- property propertyName(input): description
- property invariant(input) -> expected"
                spellCheck={false}
              />

              {/* Character count */}
              <div className="text-right mt-2 text-xs text-gray-500">
                {specText.length} / {MAX_INPUT_LENGTH} characters
              </div>

              {/* Quick Help */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400"
              >
                <p className="mb-2"><strong>Spec Format:</strong></p>
                <pre className="text-gray-300 overflow-x-auto"># spec: MySpec
- property addCommutative(a, b): a + b == b + a
- property noEmptyString: invariant(input) -&gt; input.length &gt;= 0
- property noCrashOnNull: no-crash(null)</pre>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "tests" && (
            <motion.div
              key="tests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-900/50 border border-gray-700 rounded-xl p-6"
            >
              {/* Test Results Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-200">Generated Tests</h2>
                <div className="flex gap-2">
                  {generatedTests && (
                    <>
                      <motion.button
                        onClick={handleRunTests}
                        disabled={isRunningTests}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                          isRunningTests
                            ? "bg-purple-600 text-white cursor-wait"
                            : "bg-purple-700 hover:bg-purple-600 text-white"
                        }`}
                      >
                        {isRunningTests ? (
                          <>
                            <motion.div
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Running...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Run Tests
                          </>
                        )}
                      </motion.button>
                      <motion.button
                        onClick={handleCopy}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </motion.button>
                      <motion.button
                        onClick={handleDownload}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Test Results Display */}
              {testResults && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg"
                >
                  <pre className="text-blue-300 text-sm whitespace-pre-wrap">{testResults}</pre>
                </motion.div>
              )}

              {/* Test Output */}
              {generatedTests ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative"
                >
                  <pre
                    className="language-javascript bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: escapeHtml(generatedTests.code)
                    }}
                  />
                  
                  {/* Floating ghost indicator */}
                  <AnimatePresence>
                    {showGhost && (
                      <motion.div
                        className="absolute bottom-4 right-4 text-purple-400"
                        initial={{ scale: 0, opacity: 0, y: 20 }}
                        animate={{ scale: [0.8, 1, 0.8], opacity: [0, 1, 0], y: [20, 0, -10] }}
                        exit={{ scale: 0, opacity: 0, y: -20 }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      >
                        <GhostIcon className="w-8 h-8" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-500"
                >
                  <motion.div
                    variants={float}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <GhostIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  </motion.div>
                  <p className="text-lg">No tests generated yet</p>
                  <p className="text-sm mt-2">Write a spec and click "Generate Tests"</p>
                </motion.div>
              )}

              {/* Warnings for generated tests */}
              {generatedTests?.warnings && generatedTests.warnings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg"
                >
                  <p className="text-yellow-400 text-sm"><strong>Generation Warnings:</strong></p>
                  <ul className="list-disc list-inside text-yellow-300 text-sm mt-1">
                    {generatedTests.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center text-gray-500 text-sm"
      >
        <p>
          Built with <span className="text-purple-400">❤️</span> for Kiroween 2026
        </p>
        <p className="mt-1">
          <a href="https://github.com/muhamedaldias/kiroween" className="text-gray-400 hover:text-purple-400 transition-colors">
            View on GitHub
          </a>
        </p>
      </motion.footer>
      
      {/* Ghost Visualization for failed tests */}
      <GhostVisualization
        errors={ghostErrors}
        onDismiss={() => setGhostErrors([])}
      />
    </div>
  );
}
