const USER_ID = "Sadhana.S_16122005";
const EMAIL_ID = "sd6403@srmist.edu.in";
const COLLEGE_ROLL = "RA2311003040094";

function processData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const validEdges = [];
  const seenEdges = new Set();

  for (let raw of data) {
    const entry = typeof raw === "string" ? raw.trim() : String(raw).trim();

    const match = entry.match(/^([A-Z])->([A-Z])$/);
    if (!match) {
      invalidEntries.push(raw);
      continue;
    }

    const [, parent, child] = match;

    if (parent === child) {
      invalidEntries.push(raw);
      continue;
    }

    const edgeKey = `${parent}->${child}`;
    if (seenEdges.has(edgeKey)) {
      if (!duplicateEdges.includes(edgeKey)) {
        duplicateEdges.push(edgeKey);
      }
    } else {
      seenEdges.add(edgeKey);
      validEdges.push([parent, child]);
    }
  }

  const children = new Map();
  const parentOf = new Map();

  for (const [p, c] of validEdges) {
    if (parentOf.has(c)) continue;
    parentOf.set(c, p);
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(c);
  }

  const allNodes = new Set();
  for (const [p, c] of validEdges) {
    allNodes.add(p);
    allNodes.add(c);
  }

  const parent = {};
  for (const n of allNodes) parent[n] = n;

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a, b) {
    parent[find(a)] = find(b);
  }

  for (const [p, c] of validEdges) union(p, c);

  const components = new Map();
  for (const n of allNodes) {
    const root = find(n);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(n);
  }

  const hierarchies = [];

  for (const [, nodes] of components) {
    const nodeSet = new Set(nodes);

    const roots = nodes.filter(n => !parentOf.has(n)).sort();

    let hasCycle = false;
    let compRoot;

    if (roots.length === 0) {
      hasCycle = true;
      compRoot = [...nodeSet].sort()[0];
    } else {
      compRoot = roots[0];

      const visited = new Set();
      const recStack = new Set();

      function dfs(node) {
        visited.add(node);
        recStack.add(node);
        for (const child of (children.get(node) || [])) {
          if (!visited.has(child)) {
            if (dfs(child)) return true;
          } else if (recStack.has(child)) {
            return true;
          }
        }
        recStack.delete(node);
        return false;
      }

      hasCycle = dfs(compRoot);
    }

    if (hasCycle) {
      hierarchies.push({ root: compRoot, tree: {}, has_cycle: true });
    } else {
      function buildTree(node) {
        const obj = {};
        for (const child of (children.get(node) || [])) {
          obj[child] = buildTree(child);
        }
        return obj;
      }

      function calcDepth(node) {
        const kids = children.get(node) || [];
        if (kids.length === 0) return 1;
        return 1 + Math.max(...kids.map(calcDepth));
      }

      const tree = { [compRoot]: buildTree(compRoot) };
      const depth = calcDepth(compRoot);
      hierarchies.push({ root: compRoot, tree, depth });
    }
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = "";
  if (nonCyclic.length > 0) {
    nonCyclic.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root.localeCompare(b.root);
    });
    largest_tree_root = nonCyclic[0].root;
  }

  const summary = {
    total_trees: nonCyclic.length,
    total_cycles: cyclic.length,
    largest_tree_root,
  };

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  };
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const result = processData(data);

  res.status(200).json(result);
}