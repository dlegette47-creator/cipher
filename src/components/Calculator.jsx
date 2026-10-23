import React, { useState } from 'react';

export default function Calculator({ onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [pinAttempt, setPinAttempt] = useState('');

  const handlePress = async (val) => {
    if (val === 'AC') {
      setDisplay('0');
      setPinAttempt('');
    } else if (val === '=') {
      // Extract just the numbers from whatever they typed
      const pin = display.replace(/[^0-9]/g, '');
      
      // If they typed 4 or more numbers, try to unlock the vault
      if (pin.length >= 4) {
        const success = await onUnlock(pin);
        if (success) return; // If successful, the app will unmount the calculator
      }

      // Safe arithmetic (no eval)
      try {
        const normalized = display.replace(/×/g, '*').replace(/÷/g, '/');
        // Only allow digits, operators, parens, decimal, spaces
        if (!/^[0-9+\-*/(). ]+$/.test(normalized)) {
          setDisplay('Error');
        } else {
          const result = Function('"use strict"; return (' + normalized + ')')();
          setDisplay(String(result));
        }
      } catch {
        setDisplay('Error');
      }
      setPinAttempt('');
    } else {
      setPinAttempt(prev => prev + val);
      setDisplay(prev => (prev === '0' || prev === 'Error') ? val : prev + val);
    }
  };

  const buttons = [
    'AC', '+/-', '%', '÷',
    '7', '8', '9', '×',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '='
  ];

  return (
    <div className="fixed inset-0 bg-white dark:bg-black flex flex-col justify-end p-4 pb-sheet pt-safe z-[9999]">
      <div className="flex-1 flex items-end justify-end p-6 mb-4">
        <h1 className="text-black dark:text-white text-7xl font-light tracking-tighter truncate max-w-full">
          {display}
        </h1>
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        {buttons.map((btn) => {
          const isZero = btn === '0';
          const isOperator = ['÷', '×', '-', '+', '='].includes(btn);
          const isTopRow = ['AC', '+/-', '%'].includes(btn);
          
          return (
            <button
              key={btn}
              onClick={() => handlePress(btn)}
              className={`
                ${isZero ? 'col-span-2 justify-start pl-8' : ''}
                ${isOperator ? 'bg-[#ff9f0a] text-black dark:text-white' : isTopRow ? 'bg-[#a5a5a5] text-black' : 'bg-[#333333] text-black dark:text-white'}
                h-20 rounded-full text-3xl font-medium flex items-center justify-center active:opacity-70 transition-opacity
              `}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
