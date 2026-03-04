'use client';

import * as React from 'react';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  id?: string;
  disabled?: boolean;
  [key: string]: any;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className = '', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onValueChange([newValue]);
    };

    return (
      <div className={`relative flex w-full items-center ${className}`}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0] || min}
          onChange={handleChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          {...props}
        />
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #f97316;
            border: 2px solid #f97316;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .slider::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
          }
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #f97316;
            border: 2px solid #f97316;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .slider::-webkit-slider-track {
            height: 8px;
            border-radius: 4px;
            background: #374151;
          }
          .slider::-moz-range-track {
            height: 8px;
            border-radius: 4px;
            background: #374151;
          }
        `}</style>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };