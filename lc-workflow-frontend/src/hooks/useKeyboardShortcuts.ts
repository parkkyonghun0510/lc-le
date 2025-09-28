/**
 * Keyboard Shortcuts Hook
 * Provides power user keyboard shortcuts for common actions.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  showToast?: boolean;
  customShortcuts?: KeyboardShortcut[];
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions = {}) => {
  const {
    enabled = true,
    showToast = true,
    customShortcuts = []
  } = options;

  const router = useRouter();
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);

  // Default shortcuts
  const defaultShortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Focus search input
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search',
      category: 'Navigation'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        router.push('/users/new');
      },
      description: 'New user',
      category: 'Navigation'
    },
    {
      key: 'h',
      ctrlKey: true,
      action: () => {
        router.push('/');
      },
      description: 'Go to home',
      category: 'Navigation'
    },
    {
      key: 'u',
      ctrlKey: true,
      action: () => {
        router.push('/users');
      },
      description: 'Go to users',
      category: 'Navigation'
    },
    {
      key: 'a',
      ctrlKey: true,
      action: () => {
        router.push('/analytics');
      },
      description: 'Go to analytics',
      category: 'Navigation'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => {
        router.push('/permissions');
      },
      description: 'Go to permissions',
      category: 'Navigation'
    },

    // Action shortcuts
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        // Trigger save action
        const saveButton = document.querySelector('button[type="submit"], button[data-action="save"]') as HTMLButtonElement;
        if (saveButton && !saveButton.disabled) {
          saveButton.click();
        }
      },
      description: 'Save changes',
      category: 'Actions'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => {
        // Trigger export action
        const exportButton = document.querySelector('button[data-action="export"], [data-testid="export-button"]') as HTMLButtonElement;
        if (exportButton) {
          exportButton.click();
        }
      },
      description: 'Export data',
      category: 'Actions'
    },
    {
      key: 'i',
      ctrlKey: true,
      action: () => {
        // Trigger import action
        const importButton = document.querySelector('button[data-action="import"], [data-testid="import-button"]') as HTMLButtonElement;
        if (importButton) {
          importButton.click();
        }
      },
      description: 'Import data',
      category: 'Actions'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        window.location.reload();
      },
      description: 'Refresh page',
      category: 'Actions'
    },

    // Selection shortcuts
    {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      action: () => {
        // Select all in current context
        const selectAllButton = document.querySelector('button[data-action="select-all"], [data-testid="select-all"]') as HTMLButtonElement;
        if (selectAllButton) {
          selectAllButton.click();
        }
      },
      description: 'Select all',
      category: 'Selection'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => {
        // Deselect all
        const deselectButton = document.querySelector('button[data-action="deselect-all"], [data-testid="deselect-all"]') as HTMLButtonElement;
        if (deselectButton) {
          deselectButton.click();
        }
      },
      description: 'Deselect all',
      category: 'Selection'
    },

    // View shortcuts
    {
      key: '1',
      ctrlKey: true,
      action: () => {
        // Switch to list view
        const listViewButton = document.querySelector('button[data-view="list"], [data-testid="list-view"]') as HTMLButtonElement;
        if (listViewButton) {
          listViewButton.click();
        }
      },
      description: 'List view',
      category: 'View'
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => {
        // Switch to grid view
        const gridViewButton = document.querySelector('button[data-view="grid"], [data-testid="grid-view"]') as HTMLButtonElement;
        if (gridViewButton) {
          gridViewButton.click();
        }
      },
      description: 'Grid view',
      category: 'View'
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => {
        // Switch to table view
        const tableViewButton = document.querySelector('button[data-view="table"], [data-testid="table-view"]') as HTMLButtonElement;
        if (tableViewButton) {
          tableViewButton.click();
        }
      },
      description: 'Table view',
      category: 'View'
    },

    // Help shortcuts
    {
      key: '?',
      action: () => {
        // Show keyboard shortcuts help
        showShortcutsHelp();
      },
      description: 'Show shortcuts help',
      category: 'Help'
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals or clear selections
        const closeButton = document.querySelector('button[data-action="close"], [data-testid="close-button"]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        } else {
          // Clear any active selections
          const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
          checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
      },
      description: 'Close modal or clear selection',
      category: 'Help'
    }
  ];

  // Combine default and custom shortcuts
  shortcutsRef.current = [...defaultShortcuts, ...customShortcuts];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.getAttribute('role') === 'textbox'
    ) {
      return;
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.metaKey === event.metaKey
      );
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        matchingShortcut.action();
        
        if (showToast) {
          toast.success(`Shortcut: ${matchingShortcut.description}`, {
            duration: 1500,
            position: 'bottom-right'
          });
        }
      } catch (error) {
        console.error('Shortcut action failed:', error);
        if (showToast) {
          toast.error('Shortcut action failed');
        }
      }
    }
  }, [enabled, showToast]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Function to show shortcuts help
  const showShortcutsHelp = useCallback(() => {
    const shortcuts = shortcutsRef.current;
    const categories = [...new Set(shortcuts.map(s => s.category))];
    
    let helpText = 'Keyboard Shortcuts:\n\n';
    
    categories.forEach(category => {
      helpText += `${category}:\n`;
      const categoryShortcuts = shortcuts.filter(s => s.category === category);
      categoryShortcuts.forEach(shortcut => {
        const keys = [];
        if (shortcut.ctrlKey) keys.push('Ctrl');
        if (shortcut.shiftKey) keys.push('Shift');
        if (shortcut.altKey) keys.push('Alt');
        if (shortcut.metaKey) keys.push('Cmd');
        keys.push(shortcut.key);
        
        helpText += `  ${keys.join(' + ')} - ${shortcut.description}\n`;
      });
      helpText += '\n';
    });

    toast(helpText, {
      duration: 10000,
      position: 'top-center',
      style: {
        whiteSpace: 'pre-line',
        maxWidth: '500px',
        textAlign: 'left'
      }
    });
  }, []);

  // Function to get all shortcuts
  const getShortcuts = useCallback(() => {
    return shortcutsRef.current;
  }, []);

  // Function to add a shortcut dynamically
  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current.push(shortcut);
  }, []);

  // Function to remove a shortcut
  const removeShortcut = useCallback((key: string, modifiers?: Partial<Pick<KeyboardShortcut, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>>) => {
    shortcutsRef.current = shortcutsRef.current.filter(shortcut => {
      if (shortcut.key !== key) return true;
      if (modifiers) {
        return !(
          !!shortcut.ctrlKey === !!modifiers.ctrlKey &&
          !!shortcut.shiftKey === !!modifiers.shiftKey &&
          !!shortcut.altKey === !!modifiers.altKey &&
          !!shortcut.metaKey === !!modifiers.metaKey
        );
      }
      return false;
    });
  }, []);

  return {
    shortcuts: getShortcuts(),
    addShortcut,
    removeShortcut,
    showShortcutsHelp
  };
};

// Hook for specific page shortcuts
export const usePageShortcuts = (pageShortcuts: KeyboardShortcut[], options?: UseKeyboardShortcutsOptions) => {
  return useKeyboardShortcuts({
    ...options,
    customShortcuts: pageShortcuts
  });
};

// Common shortcut patterns
export const CommonShortcuts = {
  // Navigation
  goToHome: (router: any) => ({ key: 'h', ctrlKey: true, action: () => router.push('/'), description: 'Go to home', category: 'Navigation' }),
  goToUsers: (router: any) => ({ key: 'u', ctrlKey: true, action: () => router.push('/users'), description: 'Go to users', category: 'Navigation' }),
  goToAnalytics: (router: any) => ({ key: 'a', ctrlKey: true, action: () => router.push('/analytics'), description: 'Go to analytics', category: 'Navigation' }),
  
  // Actions
  save: () => ({ key: 's', ctrlKey: true, action: () => {
    const saveButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    saveButton?.click();
  }, description: 'Save', category: 'Actions' }),
  
  export: () => ({ key: 'e', ctrlKey: true, action: () => {
    const exportButton = document.querySelector('[data-action="export"]') as HTMLButtonElement;
    exportButton?.click();
  }, description: 'Export', category: 'Actions' }),
  
  // View
  toggleView: (viewType: string) => ({ key: viewType === 'list' ? '1' : '2', ctrlKey: true, action: () => {
    const viewButton = document.querySelector(`[data-view="${viewType}"]`) as HTMLButtonElement;
    viewButton?.click();
  }, description: `${viewType} view`, category: 'View' })
};
