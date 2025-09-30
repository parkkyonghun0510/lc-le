'use client';

import { useState, useEffect } from 'react';

interface SearchFilters {
  search: string;
  searchFields: string[];
  role: string;
  departmentId: string;
  branchId: string;
  status: string;
  createdFrom: string;
  createdTo: string;
  lastLoginFrom: string;
  lastLoginTo: string;
  activityLevel: string;
  inactiveDays: string;
  sortBy: string;
  sortOrder: string;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

const SAVED_SEARCHES_KEY = 'userManagement_savedSearches';

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_SEARCHES_KEY);
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (error) {
        setSavedSearches([]);
      }
    }
  }, []);

  const saveSearch = (name: string, filters: SearchFilters) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString()
    };

    const updatedSearches = [...savedSearches, newSearch];
    setSavedSearches(updatedSearches);
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updatedSearches));
  };

  const deleteSearch = (id: string) => {
    const updatedSearches = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updatedSearches);
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updatedSearches));
  };

  const updateSearch = (id: string, name: string, filters: SearchFilters) => {
    const updatedSearches = savedSearches.map(search =>
      search.id === id
        ? { ...search, name, filters, createdAt: new Date().toISOString() }
        : search
    );
    setSavedSearches(updatedSearches);
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updatedSearches));
  };

  return {
    savedSearches,
    saveSearch,
    deleteSearch,
    updateSearch
  };
}