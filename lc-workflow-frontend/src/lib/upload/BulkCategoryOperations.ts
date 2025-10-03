import { DocumentType } from '../../../app/applications/new/types';

export interface FileWithCategory {
  id: string;
  file: File;
  category: DocumentType | null;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface CategoryOperation {
  type: 'set' | 'clear' | 'apply_default' | 'auto_categorize';
  targetCategory?: DocumentType;
  fileIds?: string[];
  filters?: CategoryFilter;
}

export interface CategoryFilter {
  fileTypes?: string[];
  fileNames?: string[];
  sizeRange?: { min: number; max: number };
  status?: Array<'pending' | 'uploading' | 'completed' | 'error'>;
  currentCategory?: DocumentType | null;
}

export interface CategoryStats {
  total: number;
  categorized: number;
  uncategorized: number;
  byCategory: Record<DocumentType, number>;
  byStatus: Record<string, number>;
}

export class BulkCategoryOperations {
  private files: Map<string, FileWithCategory>;

  constructor(files: FileWithCategory[] = []) {
    this.files = new Map(files.map(file => [file.id, file]));
  }

  /**
   * Update the files collection
   */
  updateFiles(files: FileWithCategory[]): void {
    this.files = new Map(files.map(file => [file.id, file]));
  }

  /**
   * Execute a category operation on multiple files
   */
  executeOperation(operation: CategoryOperation): {
    success: boolean;
    updatedFiles: FileWithCategory[];
    count: number;
    errors?: string[];
  } {
    const errors: string[] = [];
    let updatedCount = 0;

    try {
      const targetFiles = this.getFilteredFiles(operation.filters);

      for (const file of targetFiles) {
        try {
          const updatedFile = this.applyOperationToFile(file, operation);
          if (updatedFile !== file) {
            this.files.set(file.id, updatedFile);
            updatedCount++;
          }
        } catch (error) {
          errors.push(`Failed to update file ${file.file.name}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        updatedFiles: Array.from(this.files.values()),
        count: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        updatedFiles: Array.from(this.files.values()),
        count: 0,
        errors: [`Operation failed: ${error}`],
      };
    }
  }

  /**
   * Apply category to all uncategorized files
   */
  applyToUncategorized(category: DocumentType): {
    updatedFiles: FileWithCategory[];
    count: number;
  } {
    const operation: CategoryOperation = {
      type: 'set',
      targetCategory: category,
      filters: {
        currentCategory: null,
        status: ['pending'],
      },
    };

    const result = this.executeOperation(operation);
    return {
      updatedFiles: result.updatedFiles,
      count: result.count,
    };
  }

  /**
   * Clear categories from files matching filter
   */
  clearCategories(filters?: CategoryFilter): {
    updatedFiles: FileWithCategory[];
    count: number;
  } {
    const operation: CategoryOperation = {
      type: 'clear',
      filters,
    };

    const result = this.executeOperation(operation);
    return {
      updatedFiles: result.updatedFiles,
      count: result.count,
    };
  }

  /**
   * Auto-categorize files based on file type and name patterns
   */
  autoCategorize(categories: Array<{ type: DocumentType; patterns: string[] }>): {
    updatedFiles: FileWithCategory[];
    count: number;
    suggestions: Array<{ fileId: string; suggestedCategory: DocumentType; confidence: number }>;
  } {
    const suggestions: Array<{ fileId: string; suggestedCategory: DocumentType; confidence: number }> = [];
    let updatedCount = 0;

    for (const file of this.files.values()) {
      if (file.category || file.status !== 'pending') continue;

      const suggestion = this.getAutoCategorySuggestion(file, categories);
      if (suggestion) {
        suggestions.push(suggestion);

        // Apply the suggestion if confidence is high enough
        if (suggestion.confidence >= 0.8) {
          file.category = suggestion.suggestedCategory;
          updatedCount++;
        }
      }
    }

    return {
      updatedFiles: Array.from(this.files.values()),
      count: updatedCount,
      suggestions,
    };
  }

  /**
   * Get category statistics
   */
  getStats(): CategoryStats {
    const files = Array.from(this.files.values());
    const stats: CategoryStats = {
      total: files.length,
      categorized: 0,
      uncategorized: 0,
      byCategory: {} as Record<DocumentType, number>,
      byStatus: {},
    };

    for (const file of files) {
      // Count by category
      if (file.category) {
        stats.categorized++;
        stats.byCategory[file.category] = (stats.byCategory[file.category] || 0) + 1;
      } else {
        stats.uncategorized++;
      }

      // Count by status
      stats.byStatus[file.status] = (stats.byStatus[file.status] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get files that need categorization
   */
  getUncategorizedFiles(): FileWithCategory[] {
    return Array.from(this.files.values()).filter(
      file => file.status === 'pending' && !file.category
    );
  }

  /**
   * Get files by category
   */
  getFilesByCategory(category: DocumentType): FileWithCategory[] {
    return Array.from(this.files.values()).filter(file => file.category === category);
  }

  /**
   * Validate category assignments
   */
  validateCategories(): {
    isValid: boolean;
    errors: Array<{ fileId: string; error: string }>;
    warnings: Array<{ fileId: string; warning: string }>;
  } {
    const errors: Array<{ fileId: string; error: string }> = [];
    const warnings: Array<{ fileId: string; warning: string }> = [];

    for (const file of this.files.values()) {
      if (file.status === 'pending') {
        if (!file.category) {
          errors.push({
            fileId: file.id,
            error: 'File is missing a category assignment',
          });
        }

        // Check file size limits based on category
        if (file.category) {
          const sizeWarning = this.checkFileSizeForCategory(file);
          if (sizeWarning) {
            warnings.push({
              fileId: file.id,
              warning: sizeWarning,
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get suggested categories for a file
   */
  getSuggestedCategories(file: FileWithCategory): Array<{
    category: DocumentType;
    confidence: number;
    reason: string;
  }> {
    const suggestions: Array<{
      category: DocumentType;
      confidence: number;
      reason: string;
    }> = [];

    // Pattern-based suggestions
    const fileName = file.file.name.toLowerCase();
    const fileType = file.file.type.toLowerCase();

    // Photo suggestions
    if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName)) {
      suggestions.push({
        category: 'borrower_photo',
        confidence: 0.9,
        reason: 'File appears to be an image',
      });
    }

    // Document suggestions
    if (fileType === 'application/pdf' || /\.(pdf)$/i.test(fileName)) {
      if (fileName.includes('id') || fileName.includes('identification')) {
        suggestions.push({
          category: 'borrower_id',
          confidence: 0.8,
          reason: 'PDF appears to be an ID document',
        });
      } else if (fileName.includes('income') || fileName.includes('salary') || fileName.includes('pay')) {
        suggestions.push({
          category: 'borrower_income_proof',
          confidence: 0.7,
          reason: 'PDF appears to be income proof',
        });
      }
    }

    // Word document suggestions
    if (fileType.includes('word') || /\.(doc|docx)$/i.test(fileName)) {
      if (fileName.includes('contract') || fileName.includes('agreement')) {
        suggestions.push({
          category: 'contract',
          confidence: 0.8,
          reason: 'Word document appears to be a contract',
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Private helper methods
   */
  private getFilteredFiles(filters?: CategoryFilter): FileWithCategory[] {
    let files = Array.from(this.files.values());

    if (!filters) return files;

    if (filters.fileTypes) {
      files = files.filter(file =>
        filters.fileTypes!.some(type => file.file.type.includes(type) || file.file.name.endsWith(`.${type}`))
      );
    }

    if (filters.fileNames) {
      files = files.filter(file =>
        filters.fileNames!.some(pattern =>
          file.file.name.toLowerCase().includes(pattern.toLowerCase())
        )
      );
    }

    if (filters.sizeRange) {
      files = files.filter(file =>
        file.file.size >= filters.sizeRange!.min && file.file.size <= filters.sizeRange!.max
      );
    }

    if (filters.status) {
      files = files.filter(file => filters.status!.includes(file.status));
    }

    if (filters.currentCategory !== undefined) {
      files = files.filter(file => file.category === filters.currentCategory);
    }

    return files;
  }

  private applyOperationToFile(file: FileWithCategory, operation: CategoryOperation): FileWithCategory {
    const updatedFile = { ...file };

    switch (operation.type) {
      case 'set':
        if (operation.targetCategory) {
          updatedFile.category = operation.targetCategory;
        }
        break;

      case 'clear':
        updatedFile.category = null;
        break;

      case 'apply_default':
        // Apply default category based on file type
        if (!updatedFile.category) {
          const suggestions = this.getSuggestedCategories(updatedFile);
          if (suggestions.length > 0) {
            updatedFile.category = suggestions[0].category;
          }
        }
        break;

      case 'auto_categorize':
        const suggestions = this.getSuggestedCategories(updatedFile);
        if (suggestions.length > 0 && suggestions[0].confidence >= 0.6) {
          updatedFile.category = suggestions[0].category;
        }
        break;
    }

    return updatedFile;
  }

  private getAutoCategorySuggestion(
    file: FileWithCategory,
    categories: Array<{ type: DocumentType; patterns: string[] }>
  ): { fileId: string; suggestedCategory: DocumentType; confidence: number } | null {
    const fileName = file.file.name.toLowerCase();

    for (const category of categories) {
      const confidence = this.calculatePatternConfidence(fileName, category.patterns);
      if (confidence > 0.5) {
        return {
          fileId: file.id,
          suggestedCategory: category.type,
          confidence,
        };
      }
    }

    return null;
  }

  private calculatePatternConfidence(fileName: string, patterns: string[]): number {
    let maxConfidence = 0;

    for (const pattern of patterns) {
      if (fileName.includes(pattern.toLowerCase())) {
        // Simple confidence based on pattern length and position
        const confidence = Math.min(pattern.length / 20, 1.0);
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    return maxConfidence;
  }

  private checkFileSizeForCategory(file: FileWithCategory): string | null {
    if (!file.category) return null;

    // Define size limits for different categories (in bytes)
    const sizeLimits: Record<DocumentType, { max: number; recommended: number }> = {
      borrower_photo: { max: 10 * 1024 * 1024, recommended: 5 * 1024 * 1024 }, // 10MB max, 5MB recommended
      guarantor_photo: { max: 10 * 1024 * 1024, recommended: 5 * 1024 * 1024 },
      collateral_photo: { max: 15 * 1024 * 1024, recommended: 8 * 1024 * 1024 },
      borrower_id: { max: 5 * 1024 * 1024, recommended: 2 * 1024 * 1024 },
      guarantor_id: { max: 5 * 1024 * 1024, recommended: 2 * 1024 * 1024 },
      borrower_income_proof: { max: 10 * 1024 * 1024, recommended: 5 * 1024 * 1024 },
      guarantor_income_proof: { max: 10 * 1024 * 1024, recommended: 5 * 1024 * 1024 },
      land_title: { max: 20 * 1024 * 1024, recommended: 10 * 1024 * 1024 },
      collateral_document: { max: 15 * 1024 * 1024, recommended: 8 * 1024 * 1024 },
      contract: { max: 10 * 1024 * 1024, recommended: 5 * 1024 * 1024 },
      other: { max: 10 * 1024 * 1024, recommended: 5 * 1024 * 1024 },
    };

    const limits = sizeLimits[file.category];
    if (file.file.size > limits.max) {
      return `File size exceeds maximum allowed size for ${file.category} (${this.formatBytes(limits.max)})`;
    } else if (file.file.size > limits.recommended) {
      return `File size is larger than recommended for ${file.category} (${this.formatBytes(limits.recommended)})`;
    }

    return null;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}