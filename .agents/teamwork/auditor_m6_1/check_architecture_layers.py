import os
import re
import sys

src_dir = r'c:\.d\previalo-project\src'

import_pattern = re.compile(r'(?:import|from)\s+[\'"]([^\'"]+)[\'"]')

violations = []
imports_map = {}

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            if '__tests__' in root or f.endswith('.test.ts') or f.endswith('.test.tsx'):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, src_dir).replace('\\', '/')
            imports_map[rel_path] = []
            
            with open(full_path, 'r', encoding='utf-8') as fp:
                content = fp.read()
            
            for line in content.splitlines():
                line = line.strip()
                if line.startswith('//') or line.startswith('/*') or line.startswith('*'):
                    continue
                match = import_pattern.search(line)
                if match:
                    imp = match.group(1)
                    imports_map[rel_path].append(imp)
                    
                    # Rule 1: src/domain must be pure (no react, no presentation, no application, no infrastructure)
                    if rel_path.startswith('domain/'):
                        if imp.startswith('react') or imp.startswith('@/presentation') or imp.startswith('../presentation') or imp.startswith('../../presentation') or 'presentation' in imp:
                            violations.append(f"Domain leak: {rel_path} imports {imp}")
                        if imp.startswith('@/application') or 'application' in imp:
                            violations.append(f"Domain leak: {rel_path} imports {imp}")
                        if imp.startswith('@/infrastructure') or 'infrastructure' in imp:
                            violations.append(f"Domain leak: {rel_path} imports {imp}")
                    
                    # Rule 2: src/application must not import presentation
                    if rel_path.startswith('application/'):
                        if imp.startswith('@/presentation') or 'presentation' in imp:
                            violations.append(f"Application leak: {rel_path} imports presentation {imp}")
                    
                    # Rule 3: src/infrastructure must not import presentation or application
                    if rel_path.startswith('infrastructure/'):
                        if imp.startswith('@/presentation') or 'presentation' in imp:
                            violations.append(f"Infrastructure leak: {rel_path} imports presentation {imp}")

print(f"Total production source files checked: {len(imports_map)}")
print(f"Architectural boundary violations found: {len(violations)}")
for v in violations:
    print("  VIOLATION:", v)

# Check for import cycles across all files
def resolve_import(source_file, imp):
    if imp.startswith('.'):
        source_dir = os.path.dirname(source_file)
        target = os.path.normpath(os.path.join(source_dir, imp)).replace('\\', '/')
    elif imp.startswith('@/'):
        target = imp[2:]
    else:
        return None # External package
    
    # Check extensions
    for ext in ['', '.ts', '.tsx', '/index.ts', '/index.tsx']:
        candidate = target + ext
        if candidate in imports_map:
            return candidate
    return None

resolved_graph = {}
for sf, imps in imports_map.items():
    resolved_graph[sf] = []
    for imp in imps:
        res = resolve_import(sf, imp)
        if res:
            resolved_graph[sf].append(res)

cycles = []
visited = {} # 0: unvisited, 1: visiting, 2: visited
path = []

def dfs(node):
    visited[node] = 1
    path.append(node)
    for neighbor in resolved_graph.get(node, []):
        if visited.get(neighbor, 0) == 1:
            cycle_start = path.index(neighbor)
            cycles.append(path[cycle_start:] + [neighbor])
        elif visited.get(neighbor, 0) == 0:
            dfs(neighbor)
    path.pop()
    visited[node] = 2

for node in list(resolved_graph.keys()):
    if visited.get(node, 0) == 0:
        dfs(node)

print(f"Circular dependency cycles detected: {len(cycles)}")
for c in cycles:
    print("  CYCLE:", " -> ".join(c))

if len(violations) == 0 and len(cycles) == 0:
    print("CLEAN ARCHITECTURE UNIDIRECTIONAL DEPENDENCY VERIFICATION: 100% CLEAN!")
else:
    print("ARCHITECTURAL INTEGRITY FAILURE!")
