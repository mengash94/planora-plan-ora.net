import { useState, useEffect } from 'react';

/**
 * Hook to check if this is the user's first visit to a specific page
 * @param {string} pageKey - Unique identifier for the page
 * @param {string} userId - Current user's ID
 * @returns {boolean} - Whether this is the first visit
 */
export const useFirstVisit = (pageKey, userId) => {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (!pageKey || !userId) return;

    const storageKey = `visited_pages_${userId}`;
    
    try {
      const visitedPages = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      if (!visitedPages[pageKey]) {
        // First visit to this page
        setIsFirstVisit(true);
        
        // Mark as visited
        visitedPages[pageKey] = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify(visitedPages));
      } else {
        setIsFirstVisit(false);
      }
    } catch (error) {
      console.error('Error checking first visit:', error);
      setIsFirstVisit(false);
    }
  }, [pageKey, userId]);

  return isFirstVisit;
};

/**
 * Reset all visited pages for a user (useful for testing or onboarding reset)
 */
export const resetVisitedPages = (userId) => {
  if (!userId) return;
  const storageKey = `visited_pages_${userId}`;
  localStorage.removeItem(storageKey);
};