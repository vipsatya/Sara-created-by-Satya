import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Loader2, Power } from 'lucide-react';
import { LiveSession, SessionState } from './lib/live-session';

export default function App() {
  const [state, setState] = useState<SessionState>('disconnected');
  const sessionRef = useRef<LiveSession | null>(null);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  const toggleSession = async () => {
    if (state === 'disconnected') {
      sessionRef.current = new LiveSession(setState);
      await sessionRef.current.connect();
    } else {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
        sessionRef.current = null;
      }
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'disconnected': return 'SYSTEM OFFLINE';
      case 'connecting': return 'INITIALIZING SARA...';
      case 'listening': return 'SARA IS LISTENING';
      case 'speaking': return 'SARA IS SPEAKING';
    }
  };

  const getGlowColor = () => {
    switch (state) {
      case 'disconnected': return 'rgba(255, 255, 255, 0.1)';
      case 'connecting': return 'rgba(255, 165, 0, 0.5)';
      case 'listening': return 'rgba(0, 255, 255, 0.6)';
      case 'speaking': return 'rgba(255, 0, 255, 0.6)';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans overflow-hidden relative">
      {/* Background Atmosphere */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: `radial-gradient(circle at 50% 50%, ${getGlowColor()} 0%, transparent 60%)`
        }}
        transition={{ duration: 1 }}
        style={{ filter: 'blur(80px)', opacity: 0.8 }}
      />

      {/* Header */}
      <div className="absolute top-8 left-0 w-full text-center z-10">
        <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-white/90" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Sara
        </h1>
        <p 
          className="text-xs tracking-[0.3em] mt-2 text-fuchsia-400 font-semibold" 
          style={{ textShadow: '0 0 10px #e879f9, 0 0 20px #d946ef' }}
        >
          CREATED BY SATYA
        </p>
      </div>

      {/* Main Interaction Area */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        
        {/* Central Orb / Button */}
        <motion.button
          onClick={toggleSession}
          className="relative w-48 h-48 rounded-full flex items-center justify-center outline-none focus:outline-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Outer Ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/20"
            animate={{
              scale: state === 'listening' ? [1, 1.15, 1] : state === 'speaking' ? [1, 1.3, 1] : 1,
              opacity: state === 'disconnected' ? 0.3 : state === 'listening' ? [0.2, 0.6, 0.2] : 1
            }}
            transition={{
              duration: state === 'speaking' ? 1 : 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Inner Glow */}
          <motion.div
            className="absolute inset-2 rounded-full"
            animate={{
              backgroundColor: state === 'disconnected' ? '#1a1a1a' : 
                               state === 'connecting' ? '#332200' : 
                               state === 'listening' ? '#003333' : '#330033',
              boxShadow: state === 'listening' 
                ? [`0 0 20px ${getGlowColor()}`, `0 0 60px ${getGlowColor()}`, `0 0 20px ${getGlowColor()}`]
                : `0 0 40px ${getGlowColor()}`
            }}
            transition={{ 
              duration: state === 'listening' ? 3 : 0.5,
              repeat: state === 'listening' ? Infinity : 0,
              ease: "easeInOut"
            }}
          />

          {/* Icon */}
          <div className="relative z-10 text-white/80">
            <AnimatePresence mode="wait">
              {state === 'disconnected' && (
                <motion.div key="power" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Power size={48} />
                </motion.div>
              )}
              {state === 'connecting' && (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 size={48} className="animate-spin" />
                </motion.div>
              )}
              {state === 'listening' && (
                <motion.div key="mic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Mic size={48} />
                  </motion.div>
                </motion.div>
              )}
              {state === 'speaking' && (
                <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 bg-white rounded-full"
                      animate={{ height: [12, 48, 12] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.button>

        {/* Status Text */}
        <motion.div 
          className="mt-12 text-sm tracking-[0.2em] font-mono text-white/60"
          animate={{ opacity: state === 'connecting' ? [0.5, 1, 0.5] : 1 }}
          transition={{ duration: 1.5, repeat: state === 'connecting' ? Infinity : 0 }}
        >
          {getStatusText()}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 w-full text-center z-10">
        <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase font-mono">
          {state === 'disconnected' ? 'TAP TO INITIATE SEQUENCE' : 'TAP TO TERMINATE SEQUENCE'}
        </p>
      </div>
    </div>
  );
}
