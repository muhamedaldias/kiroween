/**
 * Type inference and arbitrary generation utilities for property-based testing
 */

export type PrimitiveType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'bigint' 
  | 'symbol' 
  | 'undefined' 
  | 'null' 
  | 'any';

export interface InferredType {
  type: PrimitiveType | 'array' | 'object' | 'unknown';
  elementType?: InferredType;
  properties?: Record<string, InferredType>;
  isOptional?: boolean;
}

export interface ArbitraryInfo {
  importStatement: string;
  arbitrary: string;
}

/**
 * Infer type from a string description
 */
export function inferType(description: string): InferredType {
  const desc = description.trim().toLowerCase();
  
  // Handle array types
  if (desc.includes('[]') || desc.includes('array')) {
    const baseType = desc.replace(/(\[\]|array)/gi, '').trim();
    return {
      type: 'array',
      elementType: inferType(baseType || 'any')
    };
  }
  
  // Handle object types
  if (desc.includes('object') || desc.includes('{}')) {
    return {
      type: 'object',
      properties: {}
    };
  }
  
  // Handle specific types
  if (desc.includes('string') || desc.includes('str')) return { type: 'string' };
  if (desc.includes('number') || desc.includes('num') || desc.includes('int') || desc.includes('float')) return { type: 'number' };
  if (desc.includes('boolean') || desc.includes('bool')) return { type: 'boolean' };
  if (desc.includes('bigint')) return { type: 'bigint' };
  if (desc.includes('symbol')) return { type: 'symbol' };
  if (desc.includes('undefined')) return { type: 'undefined' };
  if (desc.includes('null')) return { type: 'null' };
  
  // Default to string for text descriptions
  if (desc.length === 0 || /^[a-z]+$/i.test(desc)) {
    return { type: 'string' };
  }
  
  return { type: 'unknown' };
}

/**
 * Infer type from property name and input
 */
export function inferFromProperty(name: string, input: string): InferredType {
  // Check if input contains type hints
  if (input) {
    return inferType(input);
  }
  
  // Infer from property name
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('string') || nameLower.includes('text') || nameLower.includes('name')) {
    return { type: 'string' };
  }
  if (nameLower.includes('number') || nameLower.includes('count') || nameLower.includes('length') || nameLower.includes('index')) {
    return { type: 'number' };
  }
  if (nameLower.includes('boolean') || nameLower.includes('flag') || nameLower.includes('is') || nameLower.includes('has')) {
    return { type: 'boolean' };
  }
  if (nameLower.includes('array') || nameLower.includes('list') || nameLower.includes('items')) {
    return { type: 'array', elementType: { type: 'string' } };
  }
  
  return { type: 'any' };
}

/**
 * Generate fast-check arbitrary for a given type
 */
export function generateArbitrary(type: InferredType): ArbitraryInfo {
  switch (type.type) {
    case 'string':
      return { importStatement: '', arbitrary: 'fc.string()' };
    
    case 'number':
      return { importStatement: '', arbitrary: 'fc.double()' };
    
    case 'boolean':
      return { importStatement: '', arbitrary: 'fc.boolean()' };
    
    case 'bigint':
      return { importStatement: '', arbitrary: 'fc.bigInt()' };
    
    case 'array':
      if (type.elementType) {
        const elementArb = generateArbitrary(type.elementType);
        return {
          importStatement: elementArb.importStatement,
          arbitrary: `fc.array(${elementArb.arbitrary})`
        };
      }
      return { importStatement: '', arbitrary: 'fc.array(fc.anything())' };
    
    case 'object':
      return { importStatement: '', arbitrary: 'fc.record({ key: fc.string(), value: fc.anything() })' };
    
    case 'any':
      return { importStatement: '', arbitrary: 'fc.anything()' };
    
    case 'unknown':
    default:
      return { importStatement: '', arbitrary: 'fc.anything()' };
  }
}

/**
 * Parse input string to extract parameter names and types
 * Example: "a, b" -> ["a", "b"]
 * Example: "a: string, b: number" -> [{name: "a", type: "string"}, {name: "b", type: "number"}]
 */
export interface ParamInfo {
  name: string;
  type: InferredType;
  raw: string;
}

export function parseParameters(input: string): ParamInfo[] {
  if (!input || input.trim() === '') {
    return [{ name: 'value', type: { type: 'any' }, raw: 'value' }];
  }
  
  const params: ParamInfo[] = [];
  const parts = input.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (!part) continue;
    
    // Check for TypeScript-style type annotations: name: type
    const typeMatch = part.match(/^([a-z_][a-z0-9_]*)\s*:\s*([a-z0-9_]+)$/i);
    if (typeMatch) {
      params.push({
        name: typeMatch[1],
        type: inferType(typeMatch[2]),
        raw: part
      });
      continue;
    }
    
    // Just a name
    params.push({
      name: part,
      type: inferFromProperty('', part),
      raw: part
    });
  }
  
  return params.length > 0 ? params : [{ name: 'value', type: { type: 'any' }, raw: 'value' }];
}

/**
 * Generate parameter declarations for a test function
 */
export function generateParameterDeclarations(params: ParamInfo[]): string {
  return params.map(p => `${p.name}`).join(', ');
}

/**
 * Generate fast-check property call with parameters
 */
export function generatePropertyCall(params: ParamInfo[]): string {
  if (params.length === 1) {
    const arb = generateArbitrary(params[0].type);
    return `${arb.arbitrary}`;
  }
  
  const arbs = params.map(p => {
    const arb = generateArbitrary(p.type);
    return arb.arbitrary;
  });
  
  return `fc.tuple([${arbs.join(', ')}])`;
}

/**
 * Generate destructured parameters for tuple
 */
export function generateDestructuredParams(params: ParamInfo[]): string {
  if (params.length === 1) {
    return params[0].name;
  }
  return `[${params.map(p => p.name).join(', ')}]`;
}

/**
 * Generate test assertion based on property kind
 */
export function generateAssertion(
  kind: 'roundtrip' | 'invariant' | 'no-crash',
  expected: string | undefined,
  params: ParamInfo[],
  input: string
): { assertion: string; comment: string } {
  switch (kind) {
    case 'roundtrip':
      // For roundtrip, we need to encode and decode
      return {
        assertion: `expect(decode(encode(${generateDestructuredParams(params)}))).toEqual(${generateDestructuredParams(params)})`,
        comment: `// Roundtrip: encode -> decode should equal original`
      };
    
    case 'no-crash':
      // For no-crash, just ensure no exception is thrown
      return {
        assertion: `expect(() => { /* TODO: call function with ${params.map(p => p.name).join(', ')} */ }).not.toThrow()`,
        comment: `// No-crash: function should not throw`
      };
    
    case 'invariant':
    default:
      // For invariant, use the expected value if provided
      if (expected) {
        // Try to parse expected as a boolean expression
        if (expected.toLowerCase() === 'true') {
          return {
            assertion: `expect(true).toBe(true)`,
            comment: `// Invariant: always true`
          };
        }
        if (expected.toLowerCase() === 'false') {
          return {
            assertion: `expect(false).toBe(false)`,
            comment: `// Invariant: always false`
          };
        }
        // Check if expected is a property check (e.g., "input.length >= 0")
        if (expected.includes('>=') || expected.includes('>') || expected.includes('<=') || expected.includes('<') || expected.includes('===') || expected.includes('!==')) {
          return {
            assertion: `expect(${generateDestructuredParams(params)}).toSatisfy(${expected})`,
            comment: `// Invariant: ${input} -> ${expected}`
          };
        }
        // Try to use expected as a comparison
        return {
          assertion: `expect(${generateDestructuredParams(params)}).toEqual(${expected})`,
          comment: `// Invariant: ${input} -> ${expected}`
        };
      }
      
      // Generic invariant - always true
      return {
        assertion: `expect(true).toBe(true)`,
        comment: `// Invariant: ${input || 'unknown'}`
      };
  }
}
