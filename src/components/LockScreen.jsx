import React, { useState } from 'react';

export default function LockScreen({ onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [pinAttempt, setPinAttempt] = useState('');

  const handlePress = (val) => {
    if (val === 'AC') {
      setDisplay('0');
      setPinAttempt('');
    } else if (val === '=') {
      // 1234 is the secret PIN to unlock
      if (pinAttempt === '1234' || display === '1234') {
        onUnlock();
      } else {
        try {
          // Act like a real calculator if it's not the PIN
          // eslint-disable-next-line no-eval
          const result = eval(display);
          setDisplay(String(result));
        } catch {
          setDisplay('Error');
        }
        setPinAttempt('');
      }
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
    <div className="fixed inset-0 bg-white dark:bg-black flex flex-col justify-end p-4 pb-12 z-[9999]">
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
