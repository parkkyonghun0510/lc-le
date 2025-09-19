'use client';

import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Step } from '../types';

interface StepIndicatorProps {
  steps: Step[];
  activeStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  activeStep,
}) => {
  return (
    <div className="mb-6 sm:mb-8">
      <nav aria-label="Progress">
        <div className="relative px-2 sm:px-0">
          {/* Progress line - hidden on mobile for cleaner look */}
          <div
            className="hidden sm:block absolute top-4 w-full h-0.5 bg-gray-200 dark:bg-gray-600"
            aria-hidden="true"
          />
          <div
            className="hidden sm:block absolute top-4 left-0 h-0.5 bg-blue-600"
            style={{
              width: `${(activeStep / Math.max(steps.length - 1, 1)) * 100}%`,
            }}
            aria-hidden="true"
          />
          
          {/* Mobile: Horizontal scroll, Desktop: Flex justify-between */}
          <div className="sm:hidden overflow-x-auto pb-2">
            <ol className="flex space-x-4 min-w-max px-2">
              {steps.map((step, stepIdx) => {
                const isCompleted = stepIdx < activeStep;
                const isCurrent = stepIdx === activeStep;
                const IconComponent = step.icon;

                return (
                  <li key={step.id} className="relative flex-shrink-0">
                    <div className="flex flex-col items-center group">
                      <span
                        className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                          isCompleted
                            ? 'bg-blue-600 border-blue-600'
                            : isCurrent
                            ? 'border-blue-600 bg-white dark:bg-gray-800'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckIcon className="h-5 w-5 text-white" />
                        ) : (
                          <IconComponent
                            className={`h-5 w-5 ${
                              isCurrent ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'
                            }`}
                          />
                        )}
                      </span>
                      <span
                        className={`mt-2 text-xs font-medium text-center max-w-20 leading-tight ${
                          isCurrent ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Desktop layout */}
          <ol className="hidden sm:flex items-center justify-between">
            {steps.map((step, stepIdx) => {
              const isCompleted = stepIdx < activeStep;
              const isCurrent = stepIdx === activeStep;
              const IconComponent = step.icon;

              return (
                <li key={step.id} className="relative">
                  <div className="flex flex-col items-center group">
                    <span
                      className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full flex items-center justify-center border-2 ${
                        isCompleted
                          ? 'bg-blue-600 border-blue-600'
                          : isCurrent
                          ? 'border-blue-600 bg-white dark:bg-gray-800'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckIcon className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                      ) : (
                        <IconComponent
                          className={`h-4 w-4 lg:h-5 lg:w-5 ${
                            isCurrent ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        />
                      )}
                    </span>
                    <span
                      className={`mt-2 text-xs lg:text-sm font-medium text-center max-w-24 lg:max-w-32 leading-tight ${
                        isCurrent ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
    </div>
  );
};
