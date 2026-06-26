/**
 * Safely escapes characters that have special meaning in regular expressions.
 * This mitigates Regular Expression Denial of Service (ReDoS) and MongoDB query injection.
 * 
 * @param {string} text - The input search string to escape.
 * @returns {string} - The safely escaped regex-safe string.
 */
export const escapeRegex = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};
