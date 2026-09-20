/**
 * AI Question Generator Engine
 * Generates curriculum-aligned assessment questions for MCQs, Subjective Theory, and Coding.
 * Supports Gemini API with intelligent local domain generation fallback.
 */

// Built-in Knowledge Base for Topic-grounded Generation
const TOPIC_KNOWLEDGE_BASE = {
  dsa: {
    subject: 'Data Structures & Algorithms',
    topics: ['Binary Search Tree', 'Dynamic Programming', 'Graph Traversal', 'Arrays & Strings', 'Linked Lists', 'Stack & Queue', 'Sorting & Searching', 'Heaps & Priority Queues'],
    mcqPool: [
      {
        topic: 'Binary Search Tree',
        difficulty: 'MEDIUM',
        text: 'What is the worst-case time complexity of searching an element in an unbalanced Binary Search Tree (BST)?',
        options: ['O(log N)', 'O(N)', 'O(N log N)', 'O(1)'],
        correctAnswer: 'O(N)',
        explanation: 'In the worst case, an unbalanced BST degenerates into a linear linked list (skewed tree), resulting in O(N) search time.'
      },
      {
        topic: 'Binary Search Tree',
        difficulty: 'EASY',
        text: 'Which traversal of a Binary Search Tree produces elements in non-decreasing sorted order?',
        options: ['Preorder Traversal', 'Inorder Traversal', 'Postorder Traversal', 'Level Order Traversal'],
        correctAnswer: 'Inorder Traversal',
        explanation: 'Inorder traversal visits Left -> Root -> Right, which always yields nodes in ascending sorted order for a BST.'
      },
      {
        topic: 'Dynamic Programming',
        difficulty: 'MEDIUM',
        text: 'Which two key properties must a problem have to be efficiently solvable using Dynamic Programming?',
        options: [
          'Optimal Substructure and Overlapping Subproblems',
          'Greedy Choice Property and Divide & Conquer',
          'Linear Ordering and Associative Property',
          'Brute Force Space and Constant Recurrence'
        ],
        correctAnswer: 'Optimal Substructure and Overlapping Subproblems',
        explanation: 'Dynamic Programming applies when a problem exhibits both optimal substructure (optimal solution composed of optimal subsolutions) and overlapping subproblems.'
      },
      {
        topic: 'Dynamic Programming',
        difficulty: 'HARD',
        text: 'In the 0/1 Knapsack Problem with capacity W and N items, what is the standard 2D DP table space complexity?',
        options: ['O(N * W)', 'O(2^N)', 'O(N + W)', 'O(N^2)'],
        correctAnswer: 'O(N * W)',
        explanation: 'The DP state dp[i][w] represents max value using a subset of first i items with weight limit w, needing an (N+1) x (W+1) matrix.'
      },
      {
        topic: 'Graph Traversal',
        difficulty: 'MEDIUM',
        text: 'Which data structure is primarily used to implement Breadth-First Search (BFS) on an unweighted graph?',
        options: ['Queue (FIFO)', 'Stack (LIFO)', 'Min-Heap', 'Disjoint Set Union'],
        correctAnswer: 'Queue (FIFO)',
        explanation: 'BFS explores vertices layer-by-layer using a First-In-First-Out (FIFO) queue.'
      },
      {
        topic: 'Arrays & Strings',
        difficulty: 'EASY',
        text: 'What is the minimum time complexity to determine whether two strings are anagrams of each other using a frequency hash map?',
        options: ['O(N)', 'O(N log N)', 'O(N^2)', 'O(1)'],
        correctAnswer: 'O(N)',
        explanation: 'Counting characters across both strings takes single-pass linear time O(N) where N is the string length.'
      },
      {
        topic: 'Sorting & Searching',
        difficulty: 'MEDIUM',
        text: 'Which sorting algorithm guarantees O(N log N) worst-case time complexity while maintaining stability?',
        options: ['Merge Sort', 'Quick Sort', 'Heap Sort', 'Selection Sort'],
        correctAnswer: 'Merge Sort',
        explanation: 'Merge Sort maintains stability and always runs in O(N log N) time, whereas Quick Sort is O(N^2) worst case and Heap Sort is not stable.'
      }
    ],
    theoryPool: [
      {
        topic: 'Binary Search Tree',
        difficulty: 'MEDIUM',
        text: 'Explain the self-balancing mechanism in AVL Trees. How do single and double rotations restore the balance factor constraint?',
        criteria: 'Candidate must explain Balance Factor (|height(L) - height(R)| <= 1), Left/Right single rotations for LL/RR violations, and Left-Right / Right-Left double rotations for LR/RL violations.'
      },
      {
        topic: 'Dynamic Programming',
        difficulty: 'HARD',
        text: 'Compare and contrast Top-Down DP (Memoization) versus Bottom-Up DP (Tabulation). Discuss space optimization techniques like state rolling.',
        criteria: 'Explanation of recursion stack overhead vs iteration table, cache efficiency, and space reduction from O(N*W) to O(W) using 1D rolling arrays.'
      }
    ],
    codingPool: [
      {
        topic: 'Binary Search Tree',
        problemTitle: 'Validate Binary Search Tree',
        difficulty: 'MEDIUM',
        text: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST satisfies: Left subtree contains only nodes with keys strictly less than the node key, and right subtree contains only keys strictly greater.',
        language: 'Java',
        boilerplateCode: `/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode(int x) { val = x; }\n * }\n */\nclass Solution {\n    public boolean isValidBST(TreeNode root) {\n        // Implement your solution here\n        return true;\n    }\n}`,
        sampleInput: 'root = [2,1,3]',
        sampleOutput: 'true',
        constraints: 'The number of nodes in the tree is in the range [1, 10^4]. -2^31 <= Node.val <= 2^31 - 1',
        testCases: [
          { input: '[2,1,3]', expected: 'true', hidden: false },
          { input: '[5,1,4,null,null,3,6]', expected: 'false', hidden: false },
          { input: '[2147483647]', expected: 'true', hidden: true },
          { input: '[1,1]', expected: 'false', hidden: true }
        ]
      },
      {
        topic: 'Dynamic Programming',
        problemTitle: 'Longest Increasing Subsequence',
        difficulty: 'HARD',
        text: 'Given an integer array nums, return the length of the longest strictly increasing subsequence. Optimize for O(N log N) using patience sorting or binary search.',
        language: 'Python',
        boilerplateCode: `class Solution:\n    def lengthOfLIS(self, nums: list[int]) -> int:\n        # Write your code here\n        pass`,
        sampleInput: 'nums = [10,9,2,5,3,7,101,18]',
        sampleOutput: '4',
        constraints: '1 <= nums.length <= 2500. -10^4 <= nums[i] <= 10^4',
        testCases: [
          { input: '[10,9,2,5,3,7,101,18]', expected: '4', hidden: false },
          { input: '[0,1,0,3,2,3]', expected: '4', hidden: false },
          { input: '[7,7,7,7,7]', expected: '1', hidden: true }
        ]
      }
    ]
  },

  web: {
    subject: 'Full Stack Web Development',
    topics: ['React & State Management', 'Node.js & Express', 'RESTful API Design', 'Authentication & JWT', 'Asynchronous JavaScript', 'Microservices Architecture'],
    mcqPool: [
      {
        topic: 'React & State Management',
        difficulty: 'MEDIUM',
        text: 'In React 18+, which hook is used to cache expensive recalculations between renders unless dependencies change?',
        options: ['useMemo', 'useCallback', 'useEffect', 'useRef'],
        correctAnswer: 'useMemo',
        explanation: 'useMemo caches the calculated return value of a function across renders until one of its dependencies changes.'
      },
      {
        topic: 'React & State Management',
        difficulty: 'EASY',
        text: 'What is the primary role of the Virtual DOM in modern React architectures?',
        options: [
          'Minimizes costly real-DOM manipulation through batch reconciliation and diffing',
          'Compiles TypeScript directly into browser assembly code',
          'Enforces relational schema validation in front-end forms',
          'Replaces the browser HTTP engine with WebSockets'
        ],
        correctAnswer: 'Minimizes costly real-DOM manipulation through batch reconciliation and diffing',
        explanation: 'React uses an in-memory Virtual DOM representation to compute minimal diffs and apply updates in batches to the browser DOM.'
      },
      {
        topic: 'Node.js & Express',
        difficulty: 'MEDIUM',
        text: 'How does Node.js handle high-concurrency non-blocking I/O operations despite being single-threaded?',
        options: [
          'Through the Libuv Event Loop and worker thread pool for asynchronous system calls',
          'By spawning a separate operating system process for each incoming request',
          'By using multiple hardware CPU cores directly without runtime event handling',
          'Through synchronous polling of TCP sockets on the primary thread'
        ],
        correctAnswer: 'Through the Libuv Event Loop and worker thread pool for asynchronous system calls',
        explanation: 'Node.js leverages Libuv with an event-driven non-blocking event loop and an internal thread pool for file/network I/O.'
      },
      {
        topic: 'Authentication & JWT',
        difficulty: 'MEDIUM',
        text: 'Where should a JWT refresh token ideally be stored on the client side to mitigate Cross-Site Scripting (XSS) extraction?',
        options: ['In an HttpOnly, Secure, SameSite cookie', 'In localStorage', 'In sessionStorage', 'In window.globalToken variable'],
        correctAnswer: 'In an HttpOnly, Secure, SameSite cookie',
        explanation: 'HttpOnly cookies cannot be read by client-side JavaScript, protecting tokens from XSS theft.'
      }
    ],
    theoryPool: [
      {
        topic: 'RESTful API Design',
        difficulty: 'MEDIUM',
        text: 'Explain the principles of Idempotency in HTTP methods. Detail which standard HTTP verbs are idempotent and why.',
        criteria: 'Explains that multiple identical requests produce the same server resource state. Identifies GET, PUT, DELETE, HEAD as idempotent, and POST as non-idempotent.'
      }
    ],
    codingPool: [
      {
        topic: 'Node.js & Express',
        problemTitle: 'Express Rate Limiter Middleware',
        difficulty: 'MEDIUM',
        text: 'Implement an in-memory rate-limiting middleware function for Express that allows a maximum of 5 requests per IP address within a 60-second window. Return HTTP 429 when exceeded.',
        language: 'JavaScript',
        boilerplateCode: `function createRateLimiter(maxRequests = 5, windowMs = 60000) {\n    const clients = new Map();\n    return function rateLimiter(req, res, next) {\n        // Implement sliding or fixed window rate limiter\n    };\n}\nmodule.exports = createRateLimiter;`,
        sampleInput: 'req from IP 192.168.1.1 (6th request within 10s)',
        sampleOutput: 'status 429 { error: "Too many requests" }',
        constraints: 'Memory efficient, handles clean-up of stale IP entries.',
        testCases: [
          { input: '5 sequential requests', expected: 'HTTP 200 on all 5', hidden: false },
          { input: '6th request in window', expected: 'HTTP 429 Too Many Requests', hidden: false }
        ]
      }
    ]
  },

  db: {
    subject: 'Database Management Systems',
    topics: ['SQL Queries & Joins', 'Database Indexing (B-Tree)', 'Transactions & ACID', 'Normalization & Normal Forms', 'NoSQL vs Relational'],
    mcqPool: [
      {
        topic: 'Database Indexing (B-Tree)',
        difficulty: 'MEDIUM',
        text: 'Why are B+ Trees preferred over standard Binary Search Trees for disk-based database indexes?',
        options: [
          'High fan-out reduces tree depth, minimizing costly disk block I/O reads',
          'B+ Trees occupy zero memory when loaded in the buffer pool',
          'Binary search trees do not support range scans',
          'B+ Trees eliminate the need for primary keys'
        ],
        correctAnswer: 'High fan-out reduces tree depth, minimizing costly disk block I/O reads',
        explanation: 'B+ Trees have hundreds of keys per node (high fanout), keeping tree depth small (typically 3-4) and leaf nodes linked for rapid range queries.'
      },
      {
        topic: 'Transactions & ACID',
        difficulty: 'HARD',
        text: 'In SQL transaction isolation levels, which phenomenon is prevented by SERIALIZABLE that REPEATABLE READ may still permit in some engines?',
        options: ['Phantom Reads', 'Dirty Reads', 'Non-Repeatable Reads', 'Lost Updates'],
        correctAnswer: 'Phantom Reads',
        explanation: 'Phantom reads occur when a concurrent transaction inserts new rows matching a query filter. SERIALIZABLE strictly prevents phantom reads.'
      },
      {
        topic: 'Normalization & Normal Forms',
        difficulty: 'EASY',
        text: 'A database table is in Second Normal Form (2NF) if and only if it is in 1NF and:',
        options: [
          'No non-prime attribute is partially dependent on any candidate key',
          'No transitive dependencies exist between non-prime attributes',
          'Every determinant is a superkey',
          'Multivalued dependencies are completely eliminated'
        ],
        correctAnswer: 'No non-prime attribute is partially dependent on any candidate key',
        explanation: '2NF requires eliminating partial functional dependencies of non-key attributes on composite primary keys.'
      }
    ],
    theoryPool: [
      {
        topic: 'Transactions & ACID',
        difficulty: 'MEDIUM',
        text: 'Explain the Write-Ahead Logging (WAL) protocol and how it guarantees Atomicity and Durability during database crashes.',
        criteria: 'Explanation of logging changes to disk before committing dirty pages to data files, and Redo/Undo phases during ARIES recovery.'
      }
    ],
    codingPool: [
      {
        topic: 'SQL Queries & Joins',
        problemTitle: 'Department Top 3 Salaries',
        difficulty: 'HARD',
        text: 'Write a SQL query using window functions (DENSE_RANK) to find the employees who earn the top three unique salaries in each department.',
        language: 'SQL',
        boilerplateCode: `-- Table: Employee (id, name, salary, departmentId)\n-- Table: Department (id, name)\nSELECT d.name AS Department, e.name AS Employee, e.salary AS Salary\nFROM (\n    -- Write your subquery / CTE here\n) sub;`,
        sampleInput: 'Employee table with salaries across IT and Sales',
        sampleOutput: 'IT | Max | 90000; IT | Joe | 85000; IT | Randy | 85000',
        constraints: 'Handle duplicate salaries accurately using DENSE_RANK().',
        testCases: [
          { input: 'Sample departmental employee data', expected: 'Top 3 distinct salary ranks per dept', hidden: false }
        ]
      }
    ]
  },

  python_ai: {
    subject: 'Python & AI Machine Learning',
    topics: ['Python Data Structures', 'NumPy & Pandas', 'Supervised Learning', 'Model Evaluation & Overfitting', 'Neural Networks Basics'],
    mcqPool: [
      {
        topic: 'Supervised Learning',
        difficulty: 'MEDIUM',
        text: 'In classification tasks with severe class imbalance (e.g. 99% negative, 1% positive), which evaluation metric is most informative?',
        options: ['Precision-Recall AUC (PR-AUC) & F1-Score', 'Standard Classification Accuracy', 'Mean Squared Error', 'Adjusted R-squared'],
        correctAnswer: 'Precision-Recall AUC (PR-AUC) & F1-Score',
        explanation: 'Standard accuracy gives a deceptive 99% score by predicting the majority class. F1-Score and PR-AUC assess true minority detection.'
      },
      {
        topic: 'Model Evaluation & Overfitting',
        difficulty: 'EASY',
        text: 'Which regularization technique adds an L2 penalty (sum of squared weights) to the loss function to prevent overfitting?',
        options: ['Ridge Regularization (L2)', 'Lasso Regularization (L1)', 'Dropout', 'Batch Normalization'],
        correctAnswer: 'Ridge Regularization (L2)',
        explanation: 'Ridge (L2) penalizes large weight magnitudes quadratically, encouraging smaller, smoother weights without forcing them to exact zero.'
      },
      {
        topic: 'Neural Networks Basics',
        difficulty: 'MEDIUM',
        text: 'Why is the ReLU (Rectified Linear Unit) activation function commonly preferred over Sigmoid in deep hidden layers?',
        options: [
          'Mitigates the vanishing gradient problem for positive inputs and computes faster',
          'Restricts all output values strictly between -1 and 1',
          'Prevents dead neurons in every training condition',
          'Eliminates the requirement for backpropagation'
        ],
        correctAnswer: 'Mitigates the vanishing gradient problem for positive inputs and computes faster',
        explanation: 'ReLU has a constant gradient of 1 for x > 0, preventing gradients from vanishing across deep network backpropagation passes.'
      }
    ],
    theoryPool: [
      {
        topic: 'Model Evaluation & Overfitting',
        difficulty: 'MEDIUM',
        text: 'Explain the Bias-Variance Tradeoff. How do model complexity, underfitting, and overfitting interact with total error?',
        criteria: 'Defines bias error and variance error. Details how simple models have high bias and complex models have high variance, identifying the sweet spot.'
      }
    ],
    codingPool: [
      {
        topic: 'NumPy & Pandas',
        problemTitle: 'Z-Score Normalization Vectorized',
        difficulty: 'MEDIUM',
        text: 'Write a vectorized Python function using NumPy to compute the column-wise Z-Score normalization ((X - mean) / std) of a 2D matrix without Python loops.',
        language: 'Python',
        boilerplateCode: `import numpy as np\n\ndef z_score_normalize(matrix: np.ndarray) -> np.ndarray:\n    # Write vectorized implementation\n    pass`,
        sampleInput: '[[10, 20], [20, 40], [30, 60]]',
        sampleOutput: '[[-1.22, -1.22], [0, 0], [1.22, 1.22]]',
        constraints: 'No for loops, handles division by zero using np.where or epsilon.',
        testCases: [
          { input: '2x2 standard matrix', expected: 'normalized zero mean unit variance', hidden: false }
        ]
      }
    ]
  }
};

/**
 * Identify relevant domain key from subject or topic string
 */
function detectDomain(topic = '', subject = '') {
  const combined = `${topic} ${subject}`.toLowerCase();
  if (combined.includes('dsa') || combined.includes('data structure') || combined.includes('algorithm') || combined.includes('tree') || combined.includes('graph') || combined.includes('dp') || combined.includes('array') || combined.includes('sort')) {
    return 'dsa';
  }
  if (combined.includes('web') || combined.includes('react') || combined.includes('node') || combined.includes('express') || combined.includes('javascript') || combined.includes('frontend') || combined.includes('backend') || combined.includes('api') || combined.includes('jwt')) {
    return 'web';
  }
  if (combined.includes('sql') || combined.includes('database') || combined.includes('dbms') || combined.includes('query') || combined.includes('index') || combined.includes('relation') || combined.includes('acid') || combined.includes('table')) {
    return 'db';
  }
  if (combined.includes('python') || combined.includes('machine learning') || combined.includes('ai') || combined.includes('ml') || combined.includes('data science') || combined.includes('neural') || combined.includes('deep learning')) {
    return 'python_ai';
  }
  return 'dsa'; // default fallback
}

/**
 * Generate synthetic customized questions for any arbitrary user topic
 */
function generateCustomTopicQuestion(topic, idx, type = 'MCQ', difficulty = 'MEDIUM', subject = 'Engineering') {
  if (type === 'CODING') {
    return {
      id: `ai-gen-${Date.now()}-${idx}`,
      type: 'CODING',
      problemTitle: `${topic}: Implementation & Optimization`,
      text: `Design and implement an efficient algorithm for the core logic of "${topic}". Ensure proper boundary checks, optimal time complexity, and clean code formatting.`,
      difficulty,
      language: 'Java',
      marks: difficulty === 'HARD' ? 10 : 5,
      negativeMarks: 0,
      topicName: topic,
      subjectName: subject,
      sampleInput: 'Standard test input representing edge case in ' + topic,
      sampleOutput: 'Expected optimal output',
      constraints: 'Time Limit: 1.0s, Memory Limit: 256MB.',
      boilerplateCode: `// Solution template for: ${topic}\npublic class Solution {\n    public static void solve() {\n        // Write your solution here\n    }\n}`,
      testCases: [
        { input: 'Sample Case 1', expected: 'Expected 1', hidden: false },
        { input: 'Sample Case 2', expected: 'Expected 2', hidden: false },
        { input: 'Boundary Case 3', expected: 'Expected 3', hidden: true }
      ]
    };
  }

  if (type === 'THEORY' || type === 'SUBJECTIVE') {
    return {
      id: `ai-gen-${Date.now()}-${idx}`,
      type: 'THEORY',
      problemTitle: `${topic}: Conceptual & Architectural Analysis`,
      text: `Provide a detailed technical breakdown of "${topic}". Discuss its primary architecture, performance tradeoffs, practical enterprise use-cases, and common pitfalls.`,
      difficulty,
      marks: 5,
      negativeMarks: 0,
      topicName: topic,
      subjectName: subject,
      evaluationCriteria: `Candidate must clearly cover: 1) Core definitions and principles of ${topic}, 2) Key advantages and performance metrics, 3) Real-world architectural integration.`,
      explanation: `A comprehensive answer should contrast ${topic} against alternatives and highlight scalability considerations.`
    };
  }

  // Default MCQ
  const optionPool = [
    `Ensures optimal efficiency, maintainability and fault tolerance in ${topic}`,
    `Introduces high runtime overhead without providing functional benefits`,
    `Restricts all operations to strictly single-threaded synchronous blocking execution`,
    `Completely bypasses standard boundary and validation protocols`
  ];

  return {
    id: `ai-gen-${Date.now()}-${idx}`,
    type: 'MCQ',
    problemTitle: `${topic} Question ${idx}`,
    text: `In the context of ${topic}, which of the following statements best represents the standard industry architectural principle or primary operational characteristic?`,
    options: optionPool,
    correctAnswer: optionPool[0],
    difficulty,
    marks: 2,
    negativeMarks: 0.5,
    topicName: topic,
    subjectName: subject,
    explanation: `Best practice in ${topic} emphasizes optimal efficiency, maintainability and fault tolerance.`
  };
}

const TOPIC_CATALOG = [
  {
    subject: 'Data Structures & Algorithms',
    topics: [
      'Arrays & Strings',
      'Linked Lists',
      'Stack & Queue',
      'Binary Search Tree',
      'Heaps & Priority Queues',
      'Graph Traversal',
      'Dynamic Programming',
      'Sorting & Searching',
      'Recursion & Backtracking'
    ]
  },
  {
    subject: 'Full Stack Web Development',
    topics: [
      'React & State Management',
      'Node.js & Express',
      'RESTful API Design',
      'Authentication & JWT',
      'Asynchronous JavaScript',
      'Microservices Architecture'
    ]
  },
  {
    subject: 'Database Management Systems',
    topics: [
      'SQL Queries & Joins',
      'Database Indexing (B-Tree)',
      'Transactions & ACID',
      'Normalization & Normal Forms',
      'NoSQL vs Relational'
    ]
  },
  {
    subject: 'Python & AI Machine Learning',
    topics: [
      'Python Data Structures',
      'NumPy & Pandas',
      'Supervised Learning',
      'Model Evaluation & Overfitting',
      'Neural Networks Basics'
    ]
  },
  {
    subject: 'Core Computer Science',
    topics: [
      'Process Scheduling',
      'Virtual Memory & Paging',
      'Deadlocks & Concurrency',
      'Computer Networks (TCP/IP)',
      'OOP & System Design'
    ]
  }
];

/**
 * Main function: Generate AI questions with multi-topic coverage support
 */
async function generateQuestions({
  topic = 'Binary Search Tree',
  coveredTopics = [],
  subjectName = '',
  count = 5,
  type = 'MCQ', // 'MCQ' | 'THEORY' | 'CODING' | 'MIXED'
  difficulty = 'MEDIUM', // 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
  batchName = ''
}) {
  const numQuestions = Math.min(Math.max(Number(count) || 5, 1), 30);

  // Determine list of covered topics to distribute across
  let topicsList = [];
  if (Array.isArray(coveredTopics) && coveredTopics.length > 0) {
    topicsList = coveredTopics.filter(t => t && String(t).trim());
  }
  if (topicsList.length === 0 && topic) {
    topicsList = topic.split(',').map(t => t.trim()).filter(Boolean);
  }
  if (topicsList.length === 0) {
    topicsList = ['General'];
  }

  const results = [];
  let currentIdx = 1;

  for (let i = 0; i < numQuestions; i++) {
    const activeTopic = topicsList[i % topicsList.length];
    const domainKey = detectDomain(activeTopic, subjectName);
    const domain = TOPIC_KNOWLEDGE_BASE[domainKey];

    let qType = type;
    if (type === 'MIXED') {
      if (i % 3 === 0 && (domainKey === 'dsa' || domainKey === 'web')) qType = 'CODING';
      else if (i % 3 === 1) qType = 'THEORY';
      else qType = 'MCQ';
    }

    let qDiff = difficulty;
    if (difficulty === 'MIXED') {
      const diffs = ['EASY', 'MEDIUM', 'HARD'];
      qDiff = diffs[i % 3];
    }

    let chosen = null;
    if (domain) {
      if (qType === 'CODING' && domain.codingPool && domain.codingPool.length > 0) {
        const pool = domain.codingPool;
        const matched = pool.find(q => q.topic.toLowerCase().includes(activeTopic.toLowerCase()));
        chosen = JSON.parse(JSON.stringify(matched || pool[i % pool.length]));
      } else if ((qType === 'THEORY' || qType === 'SUBJECTIVE') && domain.theoryPool && domain.theoryPool.length > 0) {
        const pool = domain.theoryPool;
        const matched = pool.find(q => q.topic.toLowerCase().includes(activeTopic.toLowerCase()));
        chosen = JSON.parse(JSON.stringify(matched || pool[i % pool.length]));
        chosen.type = 'THEORY';
      } else if (domain.mcqPool && domain.mcqPool.length > 0) {
        const pool = domain.mcqPool;
        const matched = pool.filter(q => q.topic.toLowerCase().includes(activeTopic.toLowerCase()));
        if (matched.length > 0) {
          chosen = JSON.parse(JSON.stringify(matched[i % matched.length]));
        } else {
          chosen = JSON.parse(JSON.stringify(pool[i % pool.length]));
        }
        chosen.type = 'MCQ';
      }
    }

    if (chosen) {
      chosen.id = `ai-gen-${Date.now()}-${currentIdx}`;
      chosen.marks = chosen.marks || (qType === 'CODING' ? 10 : qType === 'THEORY' ? 5 : 2);
      chosen.negativeMarks = qType === 'MCQ' ? 0.5 : 0;
      chosen.difficulty = qDiff !== 'MIXED' ? qDiff : (chosen.difficulty || 'MEDIUM');
      chosen.subjectName = subjectName || (domain ? domain.subject : 'General');
      chosen.topicName = activeTopic;
      chosen.problemTitle = chosen.problemTitle || `${activeTopic} - Q${currentIdx}`;
      results.push(chosen);
    } else {
      const customQ = generateCustomTopicQuestion(activeTopic, currentIdx, qType, qDiff, subjectName || (domain ? domain.subject : 'Engineering'));
      results.push(customQ);
    }

    currentIdx++;
  }

  return {
    success: true,
    topic: topicsList.join(', '),
    coveredTopics: topicsList,
    subjectName: subjectName || (TOPIC_KNOWLEDGE_BASE[detectDomain(topicsList[0], subjectName)]?.subject || 'General'),
    batchName,
    count: results.length,
    questions: results
  };
}

/**
 * OpenAI-powered Question Generator
 * Calls OpenAI chat completions API with structured JSON schema
 */
async function generateQuestionsWithOpenAI({
  apiKey,
  model = 'gpt-4o-mini',
  coveredTopics = [],
  subjectName = '',
  count = 5,
  type = 'MCQ',
  difficulty = 'MEDIUM',
  batchName = ''
}) {
  const numQuestions = Math.min(Math.max(Number(count) || 5, 1), 30);
  const topicsStr = Array.isArray(coveredTopics) && coveredTopics.length > 0
    ? coveredTopics.join(', ')
    : 'Core Computer Science and Data Structures';

  const systemPrompt = `You are a distinguished university professor and technical assessment creator.
Generate exactly ${numQuestions} exam-ready questions based on these covered syllabus topics: "${topicsStr}".
The subject is "${subjectName || 'Computer Science & Engineering'}".
Difficulty level: ${difficulty}.
Target Question Format: ${type}.

Distribute the questions evenly across the covered topics.

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "type": "MCQ" | "CODING" | "THEORY",
      "topicName": "Name of the covered topic",
      "problemTitle": "Short title (e.g. BST Inorder Traversal)",
      "text": "Clear, rigorous problem statement or question text",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "marks": 2,
      "negativeMarks": 0.5,
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact text of the correct option",
      "explanation": "Detailed explanation of why the correct answer is right",
      "language": "Java",
      "boilerplateCode": "// starter template",
      "sampleInput": "sample input",
      "sampleOutput": "sample output",
      "constraints": "constraints",
      "testCases": [{ "input": "...", "expectedOutput": "...", "isHidden": false }],
      "evaluationCriteria": "Rubric for scoring",
      "sampleAnswer": "Ideal answer"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${numQuestions} questions strictly in JSON.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[OpenAI API Error ${response.status}]: ${errText}. Falling back to internal engine.`);
      const fallbackRes = await generateQuestions({
        coveredTopics,
        subjectName,
        count: numQuestions,
        type,
        difficulty,
        batchName
      });
      fallbackRes.provider = 'FALLBACK_BUILTIN';
      fallbackRes.fallbackReason = `OpenAI API returned HTTP ${response.status}: ${errText.slice(0, 100)}`;
      return fallbackRes;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    const rawList = parsed.questions || parsed || [];
    const questions = (Array.isArray(rawList) ? rawList : []).map((q, idx) => ({
      id: `ai-openai-${Date.now()}-${idx + 1}`,
      type: q.type || type,
      topicName: q.topicName || (coveredTopics[idx % (coveredTopics.length || 1)] || 'General'),
      subjectName: subjectName || 'Computer Science',
      problemTitle: q.problemTitle || `${q.topicName || 'Question'} ${idx + 1}`,
      text: q.text || q.question || '',
      difficulty: q.difficulty || difficulty,
      marks: Number(q.marks) || (q.type === 'CODING' ? 10 : q.type === 'THEORY' ? 5 : 2),
      negativeMarks: Number(q.negativeMarks) || (q.type === 'MCQ' ? 0.5 : 0),
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer || (q.options ? q.options[0] : ''),
      explanation: q.explanation || '',
      language: q.language || 'Java',
      boilerplateCode: q.boilerplateCode || '',
      sampleInput: q.sampleInput || '',
      sampleOutput: q.sampleOutput || '',
      constraints: q.constraints || '',
      testCases: Array.isArray(q.testCases) ? q.testCases : [],
      evaluationCriteria: q.evaluationCriteria || '',
      sampleAnswer: q.sampleAnswer || ''
    }));

    return {
      success: true,
      provider: 'OPENAI',
      model: model || 'gpt-4o-mini',
      topic: coveredTopics.join(', '),
      coveredTopics,
      subjectName,
      batchName,
      count: questions.length,
      questions
    };
  } catch (err) {
    console.error('[OpenAI Integration Exception]:', err.message);
    const fallbackRes = await generateQuestions({
      coveredTopics,
      subjectName,
      count: numQuestions,
      type,
      difficulty,
      batchName
    });
    fallbackRes.provider = 'FALLBACK_BUILTIN';
    fallbackRes.fallbackReason = err.message;
    return fallbackRes;
  }
}

module.exports = {
  generateQuestions,
  generateQuestionsWithOpenAI,
  TOPIC_CATALOG,
  TOPIC_KNOWLEDGE_BASE
};
