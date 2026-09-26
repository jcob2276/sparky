import fs from 'fs';

const code = fs.readFileSync('scratch_orca_scan/bundle.js', 'utf8');

// Find all strings that look like routes
const routeMatches = code.match(/["'](\/[a-zA-Z0-9_\-\/:]+)["']/g) || [];
const validRoutes = [...new Set(routeMatches)]
  .map(r => r.replace(/['"]/g, ''))
  .filter(r => r.startsWith('/app') || r.startsWith('/signals') || r.startsWith('/stocks') || r.startsWith('/gpw') || r.startsWith('/api') || r.startsWith('/login'));

console.log('App Routes found:');
console.log(validRoutes);

// Find dynamic imports / chunk references
const chunkMatches = code.match(/["'](\/assets\/[^"']+\.js)["']/g) || [];
console.log('\nDynamic Chunks:');
console.log([...new Set(chunkMatches)].map(c => c.replace(/['"]/g, '')));

// Find Supabase tables referenced
const fromMatches = code.match(/\.from\(["']([a-zA-Z0-9_]+)["']\)/g) || [];
console.log('\nSupabase Tables:');
console.log([...new Set(fromMatches)]);

// Find Supabase functions / rpc
const rpcMatches = code.match(/\.rpc\(["']([a-zA-Z0-9_]+)["']/g) || [];
console.log('\nSupabase RPCs:');
console.log([...new Set(rpcMatches)]);
