/**
 * Diff module - Clean text comparison and HTML diff highlighting
 */

/**
 * Extract readable text from HTML, removing scripts, styles, and tags
 */
export function extractText(html) {
  if (!html) return '';

  return html
    // Remove script and style content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count the number of character changes between two texts
 * Uses a hybrid approach: character-level for small changes, word-level for large texts
 */
export function countChanges(oldText, newText) {
  if (!oldText || !newText) return 0;
  if (oldText === newText) return 0;

  // For very small texts or when we need precision, use character-level diff
  // For larger texts, use word-level for performance
  const useCharacterLevel = oldText.length < 1000 || newText.length < 1000;

  if (useCharacterLevel) {
    return countCharacterChanges(oldText, newText);
  }

  // Word-based counting for larger texts
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);

  const lcsLength = longestCommonSubsequenceLength(oldWords, newWords);
  const added = newWords.length - lcsLength;
  const removed = oldWords.length - lcsLength;

  return added + removed;
}

/**
 * Count character-level changes (more precise for small changes)
 */
function countCharacterChanges(oldText, newText) {
  // Use Levenshtein distance approach
  // Count insertions, deletions, and substitutions
  const m = oldText.length;
  const n = newText.length;

  // If texts are very different in length, use simpler calculation
  if (Math.abs(m - n) > Math.max(m, n) * 0.5) {
    return Math.max(m, n);
  }

  // Use dynamic programming for edit distance
  // But we'll optimize for memory
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows for memory efficiency
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (oldText[i - 1] === newText[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = Math.min(
          prev[j] + 1,     // deletion
          curr[j - 1] + 1, // insertion
          prev[j - 1] + 1  // substitution
        );
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Calculate LCS length for two arrays (optimized for memory)
 */
function longestCommonSubsequenceLength(a, b) {
  if (a.length === 0 || b.length === 0) return 0;

  // Use two rows instead of full matrix for memory efficiency
  let prev = new Array(b.length + 1).fill(0);
  let curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/**
 * Generate highlighted HTML showing differences
 * @param {string} oldHtml - Previous HTML content
 * @param {string} newHtml - New HTML content
 * @param {string} highlightColor - CSS color for highlights
 * @returns {string} - HTML with changes highlighted
 */
export function highlightChanges(oldHtml, newHtml, highlightColor = '#ffff66') {
  if (!oldHtml) return newHtml || '';
  if (!newHtml) return '';
  if (oldHtml === newHtml) return newHtml;

  // Split into words while preserving HTML structure
  const oldWords = tokenize(oldHtml);
  const newWords = tokenize(newHtml);

  // Find differences
  const diff = computeDiff(oldWords, newWords);

  // Build highlighted output
  return buildHighlightedHtml(diff, highlightColor);
}

/**
 * Tokenize HTML into words and tags
 */
function tokenize(html) {
  const tokens = [];
  const regex = /(<[^>]+>)|([^<\s]+)|(\s+)/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const [full, tag, word, space] = match;
    if (tag) {
      tokens.push({ type: 'tag', value: tag });
    } else if (word) {
      tokens.push({ type: 'word', value: word });
    } else if (space) {
      tokens.push({ type: 'space', value: space });
    }
  }

  return tokens;
}

/**
 * Compute diff between two token arrays
 */
function computeDiff(oldTokens, newTokens) {
  const oldWords = oldTokens.filter(t => t.type === 'word').map(t => t.value);
  const newWords = newTokens.filter(t => t.type === 'word').map(t => t.value);

  // Create word index sets for quick lookup
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  // Mark tokens as added/unchanged
  return newTokens.map(token => {
    if (token.type !== 'word') {
      return { ...token, status: 'unchanged' };
    }

    const isNew = !oldSet.has(token.value);
    return {
      ...token,
      status: isNew ? 'added' : 'unchanged'
    };
  });
}

/**
 * Build highlighted HTML from diff result
 * Properly closes highlight spans before spaces and HTML tags to maintain valid DOM structure
 */
function buildHighlightedHtml(diff, color) {
  let result = '';
  let inHighlight = false;

  for (const token of diff) {
    if (token.status === 'added' && token.type === 'word') {
      if (!inHighlight) {
        result += `<span style="background-color: ${color};">`;
        inHighlight = true;
      }
      result += token.value;
    } else if (token.type === 'space') {
      // Always close highlight before space to prevent spaces being included in highlight
      // and to ensure proper rendering
      if (inHighlight) {
        result += '</span>';
        inHighlight = false;
      }
      result += token.value;
    } else if (token.type === 'tag') {
      // Close highlight before any HTML tag to prevent spans crossing element boundaries
      // This is critical to maintain valid DOM structure
      if (inHighlight) {
        result += '</span>';
        inHighlight = false;
      }
      result += token.value;
    } else {
      // Unchanged word
      if (inHighlight) {
        result += '</span>';
        inHighlight = false;
      }
      result += token.value;
    }
  }

  if (inHighlight) {
    result += '</span>';
  }

  return result;
}
