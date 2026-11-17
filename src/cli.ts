#!/usr/bin/env node

/**
 * GhostSpec CLI Interface
 * 
 * Enhanced CLI with watch mode, config files, and advanced features
 * 
 * Usage:
 *   npx ghostspec <command> [options]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSpec, validateSpec } from './core/spec';
import { generateTests } from './core/generate';
import { runGeneratedTests, formatTestResults, getGhostErrors } from './utils/testRunner';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for CLI output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  purple: '\x1b[35m',
  gray: '\x1b[90m'
};

// Logo
const logo = `
${colors.purple}
  ██████╗ ██╗  ██╗███████╗██████╗ ██████╗ ██████╗███████╗
  ██╔══██╗██║  ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
  ██████╔╝███████║█████╗  ██████╔╝██████╔╝██████╔╝█████╗
  ██╔══██╗██╔══██║██╔══╝  ██╔══██╗██╔══██╗██╔══██╗██╔══╝
  ██║  ██║██║  ██║███████╗██║  ██║██║  ██║██║  ██║███████╗
  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
${colors.reset}
${colors.purple}  Hauntingly good property-based test generation${colors.reset}
`;

// Configuration interface
interface Config {
  framework?: 'vitest' | 'jest' | 'ava' | 'node:test';
  outputDir?: string;
  verbose?: boolean;
  quiet?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: Config = {
  framework: 'vitest',
  outputDir: './generated',
  verbose: false,
  quiet: false
};

// State
let verbose = false;
let quiet = false;

// ============================================================================
// Utility Functions
// ============================================================================

function log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  if (quiet && level !== 'error') return;
  
  switch (level) {
    case 'success':
      console.log(`${colors.green}✓${colors.reset} ${message}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
      break;
    case 'error':
      console.error(`${colors.red}✗${colors.reset} ${message}`);
      break;
    default:
      if (verbose) {
        console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
      }
  }
}

function error(message: string, code: number = 1): never {
  console.error(`${colors.red}✗ Error:${colors.reset} ${message}`);
  process.exit(code);
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    error(`Cannot read file: ${filePath}`);
  }
}

function writeFile(filePath: string, content: string): void {
  try {
    const dir = path.dirname(filePath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    log(`Written: ${filePath}`, 'success');
  } catch {
    error(`Cannot write file: ${filePath}`);
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// ============================================================================
// Configuration Management
// ============================================================================

const CONFIG_FILE_NAMES = ['.ghostspec.json', '.ghostspecrc.json', 'ghostspec.config.json'];

function findConfigFile(): string | null {
  // Check current directory and parent directories
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    for (const configFile of CONFIG_FILE_NAMES) {
      const configPath = path.join(currentDir, configFile);
      if (fileExists(configPath)) {
        return configPath;
      }
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

function loadConfig(): Config {
  const configPath = findConfigFile();
  
  if (configPath) {
    log(`Loading config from: ${configPath}`);
    try {
      const configContent = readFile(configPath);
      const config = JSON.parse(configContent);
      return { ...DEFAULT_CONFIG, ...config };
    } catch {
      log(`Failed to load config from ${configPath}, using defaults`, 'warning');
    }
  }
  
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: Config, filePath?: string): void {
  const configPath = filePath || path.join(process.cwd(), '.ghostspec.json');
  const configContent = JSON.stringify(config, null, 2);
  writeFile(configPath, configContent);
  log(`Config saved to: ${configPath}`, 'success');
}

// ============================================================================
// Spec Format Support
// ============================================================================

function isMarkdownFile(filePath: string): boolean {
  return filePath.endsWith('.md') || filePath.endsWith('.markdown');
}

function isJSONFile(filePath: string): boolean {
  return filePath.endsWith('.json');
}

function isYAMLFile(filePath: string): boolean {
  return filePath.endsWith('.yaml') || filePath.endsWith('.yml');
}

function parseYAML(yamlContent: string): string {
  // Simple YAML to markdown converter for basic specs
  const lines = yamlContent.split('\n');
  const markdownLines: string[] = [];
  
  let inProperties = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#') || !trimmed) {
      markdownLines.push(trimmed);
      continue;
    }
    
    if (trimmed.toLowerCase().includes('properties:') || trimmed.toLowerCase().includes('properties:')) {
      inProperties = true;
      markdownLines.push('# Properties');
      continue;
    }
    
    if (inProperties && trimmed.startsWith('-')) {
      // Convert YAML property to markdown
      const match = trimmed.match(/^-\s*(?:name:\s*"?([^"]+)"?\s*)?(?:kind:\s*"?([^"]+)"?\s*)?(?:input:\s*"?([^"]+)"?\s*)?(?:expected:\s*"?([^"]+)"?)?/i);
      if (match) {
        const name = match[1] || 'unnamed';
        const kind = match[2] || 'property';
        const input = match[3] || '';
        const expected = match[4] || '';
        
        if (input) {
          const propertyLine = `- property ${name}(${input}): ${expected || kind}`;
          markdownLines.push(propertyLine);
        }
      } else {
        markdownLines.push(trimmed);
      }
    } else if (trimmed.startsWith('name:')) {
      const match = trimmed.match(/name:\s*"?([^"]+)"?/);
      if (match) {
        markdownLines.push(`# spec: ${match[1]}`);
      }
    }
  }
  
  return markdownLines.join('\n');
}

function convertToMarkdown(filePath: string, content: string): string {
  if (isMarkdownFile(filePath)) {
    return content;
  }
  
  if (isJSONFile(filePath)) {
    try {
      const spec = JSON.parse(content);
      const lines: string[] = [];
      
      if (spec.name) {
        lines.push(`# spec: ${spec.name}`);
      }
      lines.push('');
      lines.push('# Properties');
      lines.push('');
      
      if (spec.properties && Array.isArray(spec.properties)) {
        for (const prop of spec.properties) {
          const kind = prop.kind || 'property';
          const name = prop.name || 'unnamed';
          const input = prop.input || '';
          const expected = prop.expected || '';
          lines.push(`- property ${kind}(${input}): ${expected || name}`);
        }
      }
      
      return lines.join('\n');
    } catch {
      error(`Invalid JSON spec file: ${filePath}`);
    }
  }
  
  if (isYAMLFile(filePath)) {
    return parseYAML(content);
  }
  
  // Assume markdown
  return content;
}

// ============================================================================
// Interactive Mode
// ============================================================================

// function readInput(prompt: string): string {
//   Node.js readline doesn't work well in all environments
//   For now, use a simple approach
//   In the future, could use a proper readline interface
//   console.log(`${colors.cyan}?${colors.reset} ${prompt}`);
//   throw new Error('Interactive mode requires a proper terminal. Use non-interactive commands.');
// }

async function interactiveMode(): Promise<void> {
  console.log(logo);
  console.log(`${colors.bold}Welcome to GhostSpec Interactive Mode${colors.reset}\n`);
  
  // This is a placeholder - would need proper readline implementation
  log('Interactive mode: Use CLI commands instead', 'warning');
  console.log('Try: ghostspec --help');
}

// ============================================================================
// Watch Mode
// ============================================================================

function watchFile(filePath: string, command: string, options: Record<string, any>): void {
  log(`Watching ${filePath} for changes...`, 'info');
  
  // Initial run
  log('Initial run...', 'info');
  executeCommand(command, [filePath], options).catch(() => {});
  
  // Watch for changes
  fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      log(`\nDetected change in ${filePath}, re-running...`, 'success');
      executeCommand(command, [filePath], options).catch(() => {});
    }
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    log('\nWatch mode stopped', 'info');
    process.exit(0);
  });
}

// ============================================================================
// Export/Import Commands
// ============================================================================

function exportSpec(filePath: string, outputPath: string): void {
  const content = readFile(filePath);
  const markdown = convertToMarkdown(filePath, content);
  const spec = parseSpec(markdown);
  
  const exported = {
    name: spec.name || path.basename(filePath, path.extname(filePath)),
    properties: spec.properties.map(prop => ({
      name: prop.name,
      kind: prop.kind,
      input: prop.input,
      expected: prop.expected
    })),
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  writeFile(outputPath, JSON.stringify(exported, null, 2));
  log(`Exported spec to ${outputPath}`, 'success');
}

function importSpec(filePath: string, outputPath?: string): void {
  const content = readFile(filePath);
  
  try {
    const spec = JSON.parse(content);
    const markdownLines: string[] = [];
    
    if (spec.name) {
      markdownLines.push(`# spec: ${spec.name}`);
    }
    markdownLines.push('');
    markdownLines.push('# Properties');
    markdownLines.push('');
    
    if (spec.properties && Array.isArray(spec.properties)) {
      for (const prop of spec.properties) {
        const kind = prop.kind || 'property';
        const name = prop.name || 'unnamed';
        const input = prop.input || '';
        const expected = prop.expected || '';
        markdownLines.push(`- property ${kind}(${input}): ${expected || name}`);
      }
    }
    
    const markdown = markdownLines.join('\n');
    const outputFile = outputPath || filePath.replace(path.extname(filePath), '.md');
    writeFile(outputFile, markdown);
    log(`Imported spec to ${outputFile}`, 'success');
  } catch {
    error(`Invalid spec JSON file: ${filePath}`);
  }
}

// ============================================================================
// Analysis Commands
// ============================================================================

function analyzeSpec(filePath: string): void {
  const content = readFile(filePath);
  const markdown = convertToMarkdown(filePath, content);
  const spec = parseSpec(markdown);
  const validation = validateSpec(spec);
  
  console.log(`\n${colors.bold}=== Spec Analysis Report ===${colors.reset}\n`);
  console.log(`${colors.cyan}Name:${colors.reset} ${spec.name || 'Unnamed'}`);
  console.log(`${colors.cyan}Properties:${colors.reset} ${spec.properties.length}`);
  console.log(`${colors.cyan}Validation:${colors.reset} ${validation.valid ? colors.green + 'Valid' : colors.red + 'Invalid'}${colors.reset}`);
  
  if (spec.properties.length > 0) {
    console.log(`\n${colors.cyan}Property Breakdown:${colors.reset}`);
    const byKind: Record<string, number> = {};
    for (const prop of spec.properties) {
      byKind[prop.kind] = (byKind[prop.kind] || 0) + 1;
    }
    for (const [kind, count] of Object.entries(byKind)) {
      console.log(`  ${colors.yellow}${kind}${colors.reset}: ${count}`);
    }
  }
  
  if (spec.errors && spec.errors.length > 0) {
    console.log(`\n${colors.cyan}Errors:${colors.reset}`);
    for (const err of spec.errors) {
      console.log(`  ${colors.red}Line ${err.line}:${colors.reset} ${err.message}`);
    }
  }
  
  if (validation.errors && validation.errors.length > 0) {
    console.log(`\n${colors.cyan}Validation Errors:${colors.reset}`);
    for (const err of validation.errors) {
      console.log(`  ${colors.red}Line ${err.line}:${colors.reset} ${err.message}`);
    }
  }
  
  console.log('');
}

// ============================================================================
// Enhanced Test Execution
// ============================================================================

async function runWithDetailedOutput(filePath: string, _options: Record<string, any>): Promise<void> {
  const content = readFile(filePath);
  const markdown = convertToMarkdown(filePath, content);
  const results = await runGeneratedTests(markdown);
  
  console.log('\n' + formatTestResults(results));
  
  // Show ghost errors if any
  const ghostErrors = getGhostErrors(results);
  if (ghostErrors.length > 0) {
    console.log(`\n${colors.magenta}=== Ghost Error Analysis ===${colors.reset}\n`);
    for (const err of ghostErrors.slice(0, 5)) {
      console.log(`  ${colors.magenta}👻 ${err.name}:${colors.reset} ${err.error}`);
      if (err.input) {
        console.log(`    Input: ${JSON.stringify(err.input)}`);
      }
    }
  }
  
  if (results.failed > 0) {
    log(`${results.failed} test(s) failed`, 'error');
    process.exit(1);
  } else {
    log(`All ${results.passed} test(s) passed!`, 'success');
  }
}

// ============================================================================
// Command Execution
// ============================================================================

async function executeCommand(command: string, args: string[], options: Record<string, any>): Promise<void> {
  const filePath = args[0];
  
  if (!filePath) {
    error('Please specify a file');
  }
  
  switch (command) {
    case 'generate':
      {
        const content = readFile(filePath);
        const markdown = convertToMarkdown(filePath, content);
        const spec = parseSpec(markdown);
        
        const validation = validateSpec(spec);
        if (!validation.valid) {
          log('Spec validation failed:', 'warning');
          for (const err of validation.errors) {
            log(`  Line ${err.line}: ${err.message}`, 'error');
          }
        }
        
        log(`Generating tests for ${spec.name || 'spec'}...`);
        const framework = typeof options.framework === 'string' ? options.framework : undefined;
        const outputPath = options.output ? String(options.output) : 
          path.join(options.outputDir || './', `${path.basename(filePath, path.extname(filePath))}.test.js`);
        
        const tests = generateTests(spec, { 
          framework: framework as "vitest" | "jest" | "ava" | "node:test" | undefined,
          includeComments: true
        });
        
        writeFile(outputPath, tests);
        log(`Generated ${spec.properties.length} test(s) for spec: ${spec.name}`, 'success');
      }
      break;
      
    case 'run':
      await runWithDetailedOutput(filePath, options);
      break;
      
    case 'validate':
      {
        const content = readFile(filePath);
        const markdown = convertToMarkdown(filePath, content);
        const spec = parseSpec(markdown);
        const validation = validateSpec(spec);
        
        if (validation.valid) {
          log(`Spec is valid!`, 'success');
          log(`  Name: ${spec.name}`);
          log(`  Properties: ${spec.properties.length}`);
        } else {
          log(`Spec validation failed:`, 'error');
          for (const err of validation.errors) {
            console.log(`  ${colors.red}Line ${err.line}:${colors.reset} ${err.message}`);
          }
          process.exit(1);
        }
      }
      break;
      
    case 'analyze':
      analyzeSpec(filePath);
      break;
      
    case 'export':
      {
        const outputPath = args[1] || path.join(process.cwd(), `${path.basename(filePath, path.extname(filePath))}.ghostspec.json`);
        exportSpec(filePath, outputPath);
      }
      break;
      
    case 'import':
      {
        const outputPath = args[1];
        importSpec(filePath, outputPath);
      }
      break;
      
    default:
      error(`Unknown command: ${command}`);
  }
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(args: string[]): {
  command: string;
  options: Record<string, any>;
  positional: string[];
  hasWatch: boolean;
  hasInteractive: boolean;
} {
  const options: Record<string, any> = {};
  const positional: string[] = [];
  let hasWatch = false;
  let hasInteractive = false;
  let i = 0;
  
  while (i < args.length) {
    const arg = args[i];
    
    if (arg.startsWith('-')) {
      if (arg === '-v' || arg === '--verbose') {
        options.verbose = true;
        verbose = true;
      } else if (arg === '-q' || arg === '--quiet') {
        options.quiet = true;
        quiet = true;
      } else if (arg === '-w' || arg === '--watch') {
        hasWatch = true;
      } else if (arg === '-i' || arg === '--interactive') {
        hasInteractive = true;
      } else if (arg === '-o' || arg === '--output') {
        i++;
        options.output = args[i];
      } else if (arg === '-f' || arg === '--framework') {
        i++;
        options.framework = args[i];
      } else if (arg === '-c' || arg === '--config') {
        i++;
        options.config = args[i];
      } else if (arg === '--help' || arg === '-h') {
        console.log(helpMessage);
        process.exit(0);
      } else if (arg === '--version') {
        console.log('GhostSpec v0.1.0');
        process.exit(0);
      } else {
        error(`Unknown option: ${arg}`);
      }
    } else {
      positional.push(arg);
    }
    
    i++;
  }
  
  return {
    command: positional[0] || 'help',
    options,
    positional: positional.slice(1),
    hasWatch,
    hasInteractive
  };
}

// ============================================================================
// Help Message
// ============================================================================

const helpMessage = `
${logo}

${colors.bold}USAGE:${colors.reset}
  ghostspec <command> [options] [arguments]

${colors.bold}COMMANDS:${colors.reset}
  generate <file>    Generate tests from a spec file
  run <file>         Generate and run tests (simulated)
  validate <file>    Validate a spec file
  analyze <file>     Analyze spec with detailed breakdown
  export <file>      Export spec to JSON format
  import <file>      Import JSON spec to markdown
  help               Show this help message

${colors.bold}OPTIONS:${colors.reset}
  -w, --watch           Watch file for changes and re-run
  -i, --interactive     Interactive mode (experimental)
  -o, --output <file>   Output file path (default: stdout)
  -f, --framework <f>  Testing framework: vitest, jest, ava, node:test
  -c, --config <file>   Config file path
  -v, --verbose         Verbose output
  -q, --quiet           Quiet mode (only errors)

${colors.bold}EXAMPLES:${colors.reset}
  ghostspec generate spec.md
  ghostspec generate spec.md -o tests.test.js
  ghostspec generate spec.md -f jest
  ghostspec run spec.md
  ghostspec validate spec.md
  ghostspec analyze spec.md
  ghostspec export spec.md -o spec.json
  ghostspec import spec.json -o spec.md
  ghostspec run spec.md --watch

${colors.bold}VERSION:${colors.reset}
  GhostSpec v0.1.0 - Kiroween 2026

${colors.bold}DOCUMENTATION:${colors.reset}
  GitHub: https://github.com/muhamedaldias/kiroween
`;

// ============================================================================
// Main Function
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options, positional, hasWatch, hasInteractive } = parseArgs(args);
  
  // Load config if not in quiet mode
  if (!options.quiet && !hasInteractive) {
    const config = loadConfig();
    if (config.framework && !options.framework) {
      options.framework = config.framework;
    }
    if (config.outputDir && !options.output) {
      options.outputDir = config.outputDir;
    }
    if (config.verbose) {
      verbose = true;
    }
    if (config.quiet) {
      quiet = true;
    }
  }
  
  log(`GhostSpec CLI - ${command} command`, 'info');
  
  // Handle interactive mode
  if (hasInteractive || command === 'interactive') {
    await interactiveMode();
    return;
  }
  
  // Handle watch mode
  if (hasWatch) {
    if (!positional[0]) {
      error('Watch mode requires a file argument');
    }
    watchFile(positional[0], command, options);
    return;
  }
  
  // Execute command
  switch (command) {
    case 'generate':
    case 'run':
    case 'validate':
    case 'analyze':
    case 'export':
    case 'import':
      await executeCommand(command, positional, options);
      break;
    case 'help':
    case '':
      console.log(helpMessage);
      break;
    default:
      error(`Unknown command: ${command}. Use --help for available commands.`);
  }
}

// ============================================================================
// Run CLI
// ============================================================================

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
});

export { log, error, readFile, writeFile, loadConfig, saveConfig };
