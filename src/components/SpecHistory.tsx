import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  saveSpec,
  deleteSpec,
  clearSpecHistory,
  getRecentSpecs,
  toggleFavorite,
  type SpecHistoryItem
} from "../utils/storage";

interface SpecHistoryProps {
  onLoadSpec: (content: string) => void;
  currentSpec: string;
}

export default function SpecHistory({ onLoadSpec, currentSpec }: SpecHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [specs, setSpecs] = useState<SpecHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load specs on mount and when opened
  const loadSpecs = useCallback(() => {
    setSpecs(getRecentSpecs());
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      loadSpecs();
    });
  }, [loadSpecs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter specs based on search query
  const filteredSpecs = specs.filter(spec =>
    spec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spec.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Save current spec
  const handleSaveCurrent = useCallback(() => {
    if (currentSpec.trim()) {
      const firstLine = currentSpec.split('\n')[0];
      const nameMatch = firstLine.match(/#\s*spec:\s*(\S+)/i);
      const name = nameMatch ? nameMatch[1] : "Unnamed Spec";
      saveSpec(name, currentSpec);
      loadSpecs();
    }
  }, [currentSpec, loadSpecs]);

  // Load a spec from history
  const handleLoadSpec = useCallback((spec: SpecHistoryItem) => {
    onLoadSpec(spec.content);
    setIsOpen(false);
  }, [onLoadSpec]);

  // Delete a spec
  const handleDeleteSpec = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSpec(id);
    loadSpecs();
  }, [loadSpecs]);

  // Toggle favorite
  const handleToggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(id);
    loadSpecs();
  }, [loadSpecs]);

  // Clear all history
  const handleClearAll = useCallback(() => {
    if (window.confirm("Are you sure you want to delete all saved specs?")) {
      clearSpecHistory();
      loadSpecs();
    }
  }, [loadSpecs]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Button to toggle history */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadSpecs();
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm flex items-center gap-2 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        History
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl shadow-gray-900/50 z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-gray-200 font-semibold">Spec History</h3>
                <motion.button
                  onClick={handleSaveCurrent}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                  title="Save current spec"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-6 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-6 0h6" />
                  </svg>
                </motion.button>
              </div>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-900/50 outline-none"
              />
            </div>

            {/* Spec list */}
            <div className="max-h-80 overflow-y-auto">
              {filteredSpecs.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No specs found. Save your first spec to get started!
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {filteredSpecs.map((spec, index) => (
                    <motion.div
                      key={spec.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleLoadSpec(spec)}
                      className="p-3 hover:bg-gray-700/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-300 font-medium truncate">{spec.name}</span>
                            {spec.name.startsWith('⭐') && (
                              <span className="text-yellow-400 text-xs">⭐</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(spec.updatedAt).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {spec.content.split('\n')[0] || 'Empty spec'}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            onClick={(e) => handleToggleFavorite(spec.id, e)}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            className="p-1 text-gray-400 hover:text-yellow-400"
                            title="Toggle favorite"
                          >
                            <svg className="w-4 h-4" fill={spec.name.startsWith('⭐') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.975-2.888a1 1 0 00-1.176 0l-3.975 2.888c-.783.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </motion.button>
                          <motion.button
                            onClick={(e) => handleDeleteSpec(spec.id, e)}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            className="p-1 text-gray-400 hover:text-red-400"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-700 flex justify-between items-center">
              <span className="text-xs text-gray-500">{specs.length} specs saved</span>
              <motion.button
                onClick={handleClearAll}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                Clear All
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
