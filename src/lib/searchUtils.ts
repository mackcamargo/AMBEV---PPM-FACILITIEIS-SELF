import { normalizeText } from './stringUtils';

/**
 * Checks if an item matches the advanced search term using asterisk (*) separation.
 * If no asterisk is present, it checks if the full query is contained in the searchable text.
 * Otherwise, it splits by asterisks, filters out empty terms, and requires ALL terms to be present.
 * 
 * @param item The material or item to search in.
 * @param query The raw search query typed by the user.
 * @param getSearchableText A function that extracts the searchable string from the item.
 */
export function matchSearchTerm<T>(
  item: T,
  query: string,
  getSearchableText: (item: T) => string
): boolean {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return true;

  const searchableText = normalizeText(getSearchableText(item));

  // If there's no asterisk in the original query
  if (!query.includes('*')) {
    return searchableText.includes(normalizedQuery);
  }

  // If there is an asterisk, split by asterisk, ignore empty terms
  const terms = query
    .split('*')
    .map(t => normalizeText(t).trim())
    .filter(t => t !== '');

  if (terms.length === 0) return true;

  // EVERY term must be included in the searchableText
  return terms.every(term => searchableText.includes(term));
}
