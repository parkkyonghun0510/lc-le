'use client';

import React from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Step } from '../types';

interface StepNavigationProps {
  activeStep: number;
  steps: Step[];
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isNextDisabled: boolean;
  isLoading: boolean;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  activeStep,
  steps,
  onNext,
  onPrevious,
  onSubmit,
  isNextDisabled,
  isLoading,
}) => {
  const isLastStep = activeStep === steps.length - 1;
  const isFirstStep = activeStep === 0;

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
      {/* Mobile: Show progress indicator */}
      <div className="sm:hidden flex items-center justify-center mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {activeStep + 1} of {steps.length}
          </span>
        </div>
      </div>

      <button
        onClick={onPrevious}
        disabled={isFirstStep}
        className={`inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl ${
          isFirstStep
            ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
        } transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 order-2 sm:order-1`}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Previous</span>
        <span className="sm:hidden">ថយក្រោយ</span>
      </button>

      <button
        onClick={isLastStep ? onSubmit : onNext}
        disabled={isNextDisabled || isLoading}
        className="inline-flex items-center justify-center px-4 sm:px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 order-1 sm:order-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            <span className="hidden sm:inline">Processing...</span>
            <span className="sm:hidden">កំពុងដំណើរការ...</span>
          </>
        ) : isLastStep ? (
          <>
            <span className="hidden sm:inline">Submit Application</span>
            <span className="sm:hidden">ដាក់ស្នើ</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">បន្ទាប់</span>
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </>
        )}
      </button>
    </div>
  );
};