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
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => {
            const isCompleted = stepIdx < activeStep;
            const isCurrent = stepIdx === activeStep;
            const IconComponent = step.icon;

            return (
              <li
                key={step.id}
                className={`relative ${
                  stepIdx !== steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                {stepIdx !== steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-8 w-full h-0.5 ${
                      isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex flex-col items-center group">
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                      isCompleted
                        ? 'bg-blue-600 border-blue-600'
                        : isCurrent
                        ? 'border-blue-600 bg-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon className="h-4 w-4 text-white" />
                    ) : (
                      <IconComponent
                        className={`h-4 w-4 ${
                          isCurrent ? 'text-blue-600' : 'text-gray-400'
                        }`}
                      />
                    )}
                  </span>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCurrent ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-gray-400 text-center max-w-24">
                    {step.description}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};