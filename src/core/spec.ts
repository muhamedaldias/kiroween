export interface Spec {
  name: string;
  properties: Property[];
  errors?: ParseError[];
}

export interface Property {
  name: string;
  kind: "roundtrip" | "invariant" | "no-crash";
  input: string;
  expected?: string;
  lineNumber?: number;
}

export interface ParseError {
  line: number;
  message: string;
  severity: "error" | "warning";
}

// Maximum spec length to prevent DoS
const MAX_SPEC_LENGTH = 100000;
// Maximum number of properties
const MAX_PROPERTIES = 1000;

export function parseSpec(text: string): Spec {
  const errors: ParseError[] = [];
  
  // Input validation
  if (typeof text !== 'string') {
    return {
      name: "UnnamedSpec",
      properties: [],
      errors: [{ line: 0, message: "Input must be a string", severity: "error" }]
    };
  }
  
  // Length validation
  if (text.length > MAX_SPEC_LENGTH) {
    return {
      name: "UnnamedSpec",
      properties: [],
      errors: [{ line: 0, message: `Spec exceeds maximum length of ${MAX_SPEC_LENGTH} characters`, severity: "error" }]
    };
  }
  
  const lines = text.split(/\r?\n/);
  let name = "UnnamedSpec";
  const properties: Property[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('# ')) {
      // Handle name extraction from spec declaration
      if (line.startsWith('# spec:')) {
        const m = line.match(/^#\s*spec:\s*(.+)$/i);
        if (m) {
          name = m[1].trim();
          // Validate name
          if (!name || name.length > 100) {
            errors.push({
              line: i + 1,
              message: "Spec name must be 1-100 characters",
              severity: "error"
            });
          }
        }
      }
      continue;
    }
    
    // Check for property declaration
    const propertyMatch = line.match(/^-\s*property\s+([\w-]+)\s*\(([^)]*)\)\s*:\s*(.+)$/i);
    if (propertyMatch) {
      const propName = propertyMatch[1].trim();
      const propInput = propertyMatch[2].trim();
      const propExpected = propertyMatch[3].trim();
      
      // Validate property name
      if (!propName || propName.length > 100) {
        errors.push({
          line: i + 1,
          message: "Property name must be 1-100 characters",
          severity: "error"
        });
        continue;
      }
      
      // Determine property kind
      let kind: "roundtrip" | "invariant" | "no-crash" = "invariant";
      const nameLower = propName.toLowerCase();
      if (nameLower.includes("roundtrip")) {
        kind = "roundtrip";
      } else if (nameLower.includes("nocrash") || nameLower.includes("no-crash") || nameLower.includes("nocrash")) {
        kind = "no-crash";
      }
      
      // Check property count limit
      if (properties.length >= MAX_PROPERTIES) {
        errors.push({
          line: i + 1,
          message: `Maximum of ${MAX_PROPERTIES} properties exceeded`,
          severity: "error"
        });
        continue;
      }
      
      properties.push({
        name: propName,
        kind,
        input: propInput || "",
        expected: propExpected || undefined,
        lineNumber: i + 1
      });
      continue;
    }
    
    // Try alternative property syntax: - property name: kind(input) -> expected
    const altPropertyMatch = line.match(/^-\s*property\s+([\w-]+)\s*:\s*(\w+)\s*\(([^)]*)\)\s*->\s*(.+)$/i);
    if (altPropertyMatch) {
      const propName = altPropertyMatch[1].trim();
      const propKind = altPropertyMatch[2].trim().toLowerCase();
      const propInput = altPropertyMatch[3].trim();
      const propExpected = altPropertyMatch[4].trim();
      
      // Validate kind
      const validKinds = ["roundtrip", "invariant", "no-crash", "nocrash"];
      if (!validKinds.includes(propKind)) {
        errors.push({
          line: i + 1,
          message: `Invalid property kind: ${propKind}. Must be one of: ${validKinds.join(", ")}`,
          severity: "error"
        });
        continue;
      }
      
      const kind: "roundtrip" | "invariant" | "no-crash" = 
        propKind === "nocrash" ? "no-crash" : (propKind as "roundtrip" | "invariant" | "no-crash");
      
      properties.push({
        name: propName,
        kind,
        input: propInput || "",
        expected: propExpected || undefined,
        lineNumber: i + 1
      });
      continue;
    }
    
    // Try simple property syntax: - property name: description
    const simplePropertyMatch = line.match(/^-\s*property\s+([\w-]+)\s*:\s*(.+)$/i);
    if (simplePropertyMatch) {
      const propName = simplePropertyMatch[1].trim();
      const description = simplePropertyMatch[2].trim();
      
      // Determine kind from description
      let kind: "roundtrip" | "invariant" | "no-crash" = "invariant";
      const descLower = description.toLowerCase();
      if (descLower.includes("roundtrip")) {
        kind = "roundtrip";
      } else if (descLower.includes("no-crash") || descLower.includes("nocrash")) {
        kind = "no-crash";
      }
      
      properties.push({
        name: propName,
        kind,
        input: description || "",
        expected: undefined,
        lineNumber: i + 1
      });
      continue;
    }
    
    // Unrecognized line - add warning if it's not a comment or blank
    if (line.length > 0 && !line.startsWith('#') && !line.startsWith('//')) {
      errors.push({
        line: i + 1,
        message: `Unrecognized line format: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`,
        severity: "warning"
      });
    }
  }
  
  return { name, properties, errors: errors.length > 0 ? errors : undefined };
}

// Validation helper
export function validateSpec(spec: Spec): { valid: boolean; errors: ParseError[] } {
  const allErrors: ParseError[] = [...(spec.errors || [])];
  
  // Check for duplicate property names
  const nameSet = new Set<string>();
  for (const prop of spec.properties) {
    if (nameSet.has(prop.name)) {
      allErrors.push({
        line: prop.lineNumber || 0,
        message: `Duplicate property name: ${prop.name}`,
        severity: "error"
      });
    }
    nameSet.add(prop.name);
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}
