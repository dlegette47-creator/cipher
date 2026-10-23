import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Compass, User, ShieldCheck, ChevronRight, X } from 'lucide-react';

const steps = [
  {
    icon: <ShieldCheck className="text-black dark:text-white" size={48} />,
    title: "Welcome to Cipher",
    desc: "Your decentralized, encrypted messaging & commerce app. Let's take a quick tour of how to navigate.",
    color: "from-blue-500/20"
  },
  {
    icon: <MessageSquare className="text-blue-400" size={48} />,
    title: "The Chats Tab",
    desc: "Tap 'Chats' at the bottom left to access your encrypted DMs. You can also create or join public/private Groups here.",
    color: "from-green-500/20"
  },
  {
    icon: <Compass className="text-purple-400" size={48} />,
    title: "The Explore Tab",
    desc: "Tap 'Explore' in the middle to browse the Global Marketplace. Buy items using BTC or XMR seamlessly.",
    color: "from-purple-500/20"
  },
  {
    icon: <User className="text-yellow-400" size={48} />,
    title: "The Profile Tab",
    desc: "Tap 'Profile' on the right. Manage your wallet addresses, open your Vendor Dashboard to process orders, or edit your identity.",
    color: "from-yellow-500/20"
  }
];

export default function TutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.removeItem('cipher_new_account'); // Clear the flag
      onClose();
    }
  };

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-white dark:bg-black/90 backdrop-blur-md p-6"
      >
        <motion.div 
          key={currentStep}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={`relative bg-[#0a0a0a] border border-gray-300 dark:border-gray-800 rounded-3xl w-full max-w-sm p-8 overflow-hidden shadow-2xl bg-gradient-to-b ${step.color} to-transparent`}
        >
          <button 
            onClick={() => { localStorage.removeItem('cipher_new_account'); onClose(); }}
            className="absolute top-4 right-4 text-black dark:text-white/40 hover:text-black dark:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center mt-4">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-black/50 border border-gray-300 dark:border-gray-800 flex items-center justify-center mb-6 shadow-inner">
              {step.icon}
            </div>
            
            <h2 className="text-2xl font-black text-black dark:text-white mb-2">{step.title}</h2>
            <p className="text-sm text-black dark:text-white/60 leading-relaxed mb-8">{step.desc}</p>

            <div className="flex gap-2 mb-6">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-white' : 'w-1.5 bg-white/20'}`}
                />
              ))}
            </div>

            <button 
              onClick={handleNext}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {currentStep === steps.length - 1 ? "Start Using Cipher" : "Next"}
              {currentStep !== steps.length - 1 && <ChevronRight size={18} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
