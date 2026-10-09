/**
 * Coding-practice topics: which tests and skills get LeetCode / CodeChef / Codeforces
 * problems, and which tags fit them.
 * - DSA topics map to each site's matching tags (a broad "DSA" topic mixes several).
 * - Programming languages get general problems to solve in that language.
 * - SQL, shell and pandas use LeetCode's own problem sets (the other sites have none).
 * Shared by the server (fetching problems) and the dashboard (showing the button).
 */

// [match, label, LeetCode tags, Codeforces tags, CodeChef tags]; first match wins
const DSA_TOPICS = [
  [/segment tree|fenwick|binary indexed/i, 'Segment trees', ['segment-tree', 'binary-indexed-tree'], ['data structures'], []],
  [/dynamic programming|\bdp\b|memoi/i, 'Dynamic programming', ['dynamic-programming'], ['dp'], ['dynamic-programming']],
  [/\bgraphs?\b|\bbfs\b|\bdfs\b|shortest path/i, 'Graphs', ['graph', 'breadth-first-search', 'depth-first-search'], ['graphs', 'dfs and similar', 'shortest paths'], ['graphs', 'dfs', 'bfs']],
  [/linked ?lists?/i, 'Linked lists', ['linked-list'], [], []],
  [/\btrees?\b|\bbst\b/i, 'Trees', ['tree', 'binary-tree', 'binary-search-tree'], ['trees'], ['trees']],
  [/binary search/i, 'Binary search', ['binary-search'], ['binary search'], ['binary-search']],
  [/heaps?\b|priority queue/i, 'Heaps', ['heap-priority-queue'], ['data structures'], ['priority-queue']],
  [/(?<!(?:full|tech|mern|mean|lamp)[ -]?)\bstacks?\b/i, 'Stacks', ['stack', 'monotonic-stack'], ['data structures'], ['stacks']],
  [/\bqueues?\b/i, 'Queues', ['queue'], ['data structures'], ['queues']],
  [/hash/i, 'Hashing', ['hash-table'], ['hashing'], ['hashing', 'maps']],
  [/two pointers?|sliding window/i, 'Two pointers', ['two-pointers', 'sliding-window'], ['two pointers'], ['two-pointers']],
  [/prefix sums?/i, 'Prefix sums', ['prefix-sum'], ['implementation'], ['prefix-sum']],
  [/greedy/i, 'Greedy', ['greedy'], ['greedy'], ['greedy']],
  [/backtrack|recursion/i, 'Recursion and backtracking', ['backtracking', 'recursion'], ['brute force'], ['recursion', 'backtracking']],
  [/bit ?(?:manipulation|masks?)|bitwise|bitmasks?/i, 'Bit manipulation', ['bit-manipulation'], ['bitmasks'], ['bit-manipulation']],
  [/\bsort/i, 'Sorting', ['sorting'], ['sortings'], ['sorting']],
  [/\btries?\b/i, 'Tries', ['trie'], ['strings'], ['string']],
  [/\bstrings?\b/i, 'Strings', ['string'], ['strings'], ['string']],
  [/number theory|combinatorics/i, 'Number theory', ['number-theory', 'combinatorics'], ['number theory', 'combinatorics'], ['number-theory', 'combinatorics']],
  [/union find|disjoint set|\bdsu\b/i, 'Union-find', ['union-find'], ['dsu'], ['graphs']],
  [/\barrays?\b|matrix/i, 'Arrays', ['array', 'matrix'], ['implementation'], ['arrays']],
];

// Broad DSA: one problem from each of several core tags
const DSA_BROAD = /data structures?|algorithms?|\bdsa\b|competitive programming|problem solving/i;
const BROAD = {
  label: 'Data structures & algorithms',
  lc: ['array', 'hash-table', 'two-pointers', 'binary-search', 'dynamic-programming', 'graph', 'tree', 'greedy'],
  cf: ['data structures', 'greedy', 'dp', 'graphs', 'binary search', 'sortings', 'math'],
  cc: ['arrays', 'greedy', 'dynamic-programming', 'graphs', 'binary-search', 'sorting'],
};

// [match, label, LeetCode category]
const LANGUAGES = [
  [/^(?:c\s*\/\s*c\+\+|c\+\+|cpp)$/i, 'C++'],
  [/^c$/i, 'C'],
  [/^java$/i, 'Java'],
  [/^python\s*3?$/i, 'Python'],
  [/^c#$/i, 'C#'],
  [/^(?:go|golang)$/i, 'Go'],
  [/^kotlin$/i, 'Kotlin'],
  [/^swift$/i, 'Swift'],
  [/^rust$/i, 'Rust'],
  [/^php$/i, 'PHP'],
  [/^ruby$/i, 'Ruby'],
  [/^scala$/i, 'Scala'],
  [/^dart$/i, 'Dart'],
  [/^(?:javascript|js)$/i, 'JavaScript', 'javascript'],
  [/^(?:typescript|ts)$/i, 'TypeScript', 'javascript'],
];

/** The coding-practice plan for a topic, or null when it isn't a coding topic. */
export function codingTopic(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  // "Core Java", "Python programming", "C++ basics" → the language itself
  const plain = raw.replace(/^(?:core|advanced|basic)\s+/i, '').replace(/\s+(?:programming|basics|language|fundamentals|coding)$/i, '').trim();

  if (/^(?:sql|mysql|postgres(?:ql)?|oracle(?: sql)?|sql server|pl\/sql|t-sql)$/i.test(plain)) {
    return { kind: 'sql', label: 'SQL', lc: { category: 'database', tags: [] }, cf: null, cc: null };
  }
  if (/^(?:bash|shell|shell scripting|linux shell)$/i.test(plain)) {
    return { kind: 'shell', label: 'Shell', lc: { category: 'shell', tags: [] }, cf: null, cc: null };
  }
  if (/^pandas$/i.test(plain)) {
    return { kind: 'pandas', label: 'Pandas', lc: { category: 'pandas', tags: [] }, cf: null, cc: null };
  }
  const lang = LANGUAGES.find(([re]) => re.test(plain));
  if (lang) {
    const [, label, lcCategory] = lang;
    return {
      kind: 'language',
      label,
      lc: lcCategory ? { category: lcCategory, tags: [] } : { category: 'algorithms', tags: ['array', 'string', 'math'] },
      cf: { tags: ['implementation', 'math', 'strings'] },
      cc: { tags: ['implementation', 'arrays', 'string'] },
      mixed: !lcCategory,
    };
  }
  const sub = DSA_TOPICS.find(([re]) => re.test(raw));
  if (sub) {
    const [, label, lc, cf, cc] = sub;
    return { kind: 'dsa', label, lc: { category: '', tags: lc }, cf: cf.length ? { tags: cf } : null, cc: cc.length ? { tags: cc } : null };
  }
  if (DSA_BROAD.test(raw)) {
    return { kind: 'dsa', label: BROAD.label, lc: { category: '', tags: BROAD.lc }, cf: { tags: BROAD.cf }, cc: { tags: BROAD.cc }, mixed: true };
  }
  return null;
}

export const isCodingTopic = (name) => Boolean(codingTopic(name));

/** Problem difficulty that fits a test score: easy below 55%, hard from 90%. */
export const practiceLevel = (pct) => (pct == null ? 'medium' : pct < 55 ? 'easy' : pct < 90 ? 'medium' : 'hard');
