import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Generate random positions and delays outside of render
function generateGhostPosition(index: number) {
  return {
    left: `${(index * 17 + 10) % 80 + 10}%`,
    top: `${(index * 23 + 10) % 80 + 10}%`,
    delay: index * 0.5,
    duration: 3 + (index % 3)
  };
}

interface GhostError {
  testName: string;
  message: string;
  input: unknown;
  expected: unknown;
  actual: unknown;
}

interface GhostVisualizationProps {
  errors: GhostError[];
  onDismiss: () => void;
}

// Ghost character component
function GhostCharacter({ size }: { size: "small" | "medium" | "large" }) {
  const sizes = {
    small: "w-8 h-8",
    medium: "w-12 h-12",
    large: "w-16 h-16"
  };
  
  return (
    <svg
      className={`${sizes[size]} text-purple-400`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a8 8 0 0 0-4 15.5A6 6 0 0 0 12 22a6 6 0 0 0 4-4.5A8 8 0 0 0 12 2Z" />
      <circle cx="9" cy="9" r="1.5" />
      <circle cx="15" cy="9" r="1.5" />
      <path d="M12 16v4" />
    </svg>
  );
}

// Floating ghost with error message
function ErrorGhost({ error, index }: { error: GhostError; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="mb-4 p-4 bg-purple-900/20 border border-purple-700 rounded-lg relative group"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Ghost floating in corner */}
      <motion.div
        className="absolute -top-4 -right-4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0.8, 1, 0.8], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
      >
        <GhostCharacter size="medium" />
      </motion.div>
      
      {/* Error content */}
      <div className="pr-8">
        <h4 className="text-purple-300 font-medium mb-1">{error.testName}</h4>
        <p className="text-purple-400 text-sm mb-2">{error.message}</p>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-2 bg-purple-800/30 rounded text-xs space-y-1">
                {error.input && (
                  <div>
                    <span className="text-purple-500">Input:</span>
                    <span className="text-purple-300 ml-1">{JSON.stringify(error.input)}</span>
                  </div>
                )}
                {error.expected && (
                  <div>
                    <span className="text-purple-500">Expected:</span>
                    <span className="text-purple-300 ml-1">{JSON.stringify(error.expected)}</span>
                  </div>
                )}
                {error.actual && (
                  <div>
                    <span className="text-purple-500">Actual:</span>
                    <span className="text-purple-300 ml-1">{JSON.stringify(error.actual)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Main component
function GhostVisualization({ errors, onDismiss }: GhostVisualizationProps) {
  if (errors.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-6 right-6 z-50"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/95 backdrop-blur border border-purple-700 rounded-xl p-6 shadow-2xl shadow-purple-900/50"
      >
        {/* Header */}
        <motion.div
          className="flex justify-between items-center mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 flex items-center gap-2">
            <GhostCharacter size="small" />
            Test Failures ({errors.length})
          </h3>
          <motion.button
            onClick={onDismiss}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </motion.div>
        
        {/* Errors */}
        <div className="max-h-96 overflow-y-auto">
          <AnimatePresence mode="wait">
            {errors.map((error, index) => (
              <ErrorGhost key={index} error={error} index={index} />
            ))}
          </AnimatePresence>
        </div>
        
        {/* Floating ghosts in background */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const pos = generateGhostPosition(i);
            return (
              <motion.div
                key={i}
                className="absolute text-purple-400/10"
                style={{
                  left: pos.left,
                  top: pos.top
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0.5, 1, 0.5], 
                  opacity: [0, 1, 0],
                  y: [0, -10, 0]
                }}
                transition={{ 
                  duration: pos.duration, 
                  repeat: Infinity,
                  delay: pos.delay
                }}
              >
                <GhostCharacter size="small" />
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default GhostVisualization;
export { GhostCharacter };
