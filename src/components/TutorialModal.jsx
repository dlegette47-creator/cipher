import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Compass, User, ShieldCheck, ChevronRight, X } from 'lucide-react';

const steps = [
  {
    icon: <ShieldCheck size={36} className="text-white relative z-10" />,
    title: "Welcome to Cipher",
    desc: "Your decentralized, encrypted messaging & commerce app. Let's take a quick tour of how to navigate."
  },
  {
    icon: <MessageSquare size={36} className="text-blue-400 relative z-10" />,
    title: "The Chats Tab",
    desc: "Tap 'Chats' at the bottom left to access your encrypted DMs. You can also create or join Groups here."
  },
  {
    icon: <Compass size={36} className="text-purple-400 relative z-10" />,
    title: "The Explore Tab",
    desc: "Tap 'Explore' in the middle to browse the Global Marketplace. Buy items using BTC or XMR seamlessly."
  },
  {
    icon: <User size={36} className="text-green-400 relative z-10" />,
    title: "The Profile Tab",
    desc: "Tap 'Profile' on the right. Manage your wallet, open your Vendor Dashboard, or edit your identity."
  }
];

export default function TutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.removeItem('cipher_new_account');
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
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
      >
        <motion.div 
          key={currentStep}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-sm p-8 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        >
          {/* Skip button */}
          <button 
            onClick={() => { localStorage.removeItem('cipher_new_account'); onClose(); }}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center mt-2">
            
            {/* Glowing Icon Box */}
            <div className="w-20 h-20 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-[1.5rem] flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5 blur-xl"></div>
              {step.icon}
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-white mb-3">{step.title}</h2>
            <p className="text-[15px] text-gray-400 leading-relaxed mb-8 px-2">{step.desc}</p>

            {/* Sleek Progress Dots */}
            <div className="flex gap-2 mb-8">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep 
                      ? 'w-6 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                      : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <button 
              onClick={handleNext}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[16px] tracking-wide py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.4)] transition-all active:scale-[0.98]"
            >
              {currentStep === steps.length - 1 ? "Start Using Cipher" : "Continue"}
              {currentStep !== steps.length - 1 && <ChevronRight size={18} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
