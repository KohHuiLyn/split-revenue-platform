'use client';

import { motion } from 'motion/react';
import { DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';

export function RevenueSplitVisualization() {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(false);
      setTimeout(() => setIsAnimating(true), 100);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const collaborators = [
    { name: 'Alice', percentage: 40, color: '#00d4ff', position: { x: -120, y: -80 } },
    { name: 'Bob', percentage: 35, color: '#ff6b4a', position: { x: -120, y: 80 } },
    { name: 'Charlie', percentage: 25, color: '#ffd700', position: { x: -120, y: 240 } }
  ];

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 bg-[#00d4ff] opacity-20 blur-[80px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-3 bg-gradient-to-r from-[#00d4ff]/20 to-[#0099ff]/20 backdrop-blur-sm border border-[#00d4ff]/30 rounded-xl flex items-center gap-3"
      >
        <DollarSign className="w-5 h-5 text-[#00d4ff]" />
        <span className="font-semibold text-white">$12,450</span>
      </motion.div>

      {isAnimating && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 120 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute top-16 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#00d4ff] to-transparent"
        />
      )}

      {isAnimating && [0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 140, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.2, delay: i * 0.3, ease: "linear" }}
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-[#00d4ff] rounded-full shadow-[0_0_10px_rgba(0,212,255,0.8)]"
        />
      ))}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
        className="relative z-10"
      >
        <div className="relative w-48 h-48 bg-gradient-to-br from-[#1a1f3f] to-[#0a0e27] rounded-2xl border-2 border-[#00d4ff]/30 shadow-[0_0_60px_rgba(0,212,255,0.3)] flex items-center justify-center group hover:scale-105 transition-transform">
          <div className="absolute inset-4 bg-gradient-to-br from-[#00d4ff]/10 to-transparent rounded-xl" />

          <div className="relative text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#00d4ff] to-[#0099ff] rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="font-['Epilogue'] font-bold text-white text-lg">Revenue Vault</div>
            <div className="text-sm text-white/50 mt-1">Smart Contract</div>
          </div>

          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 border-2 border-[#00d4ff] rounded-2xl"
          />
        </div>
      </motion.div>

      {collaborators.map((collab, index) => (
        <div key={collab.name} className="absolute" style={{
          right: collab.position.x,
          top: `calc(50% + ${collab.position.y}px)`,
          transform: 'translateY(-50%)'
        }}>
          {isAnimating && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 280 }}
              transition={{ duration: 0.6, delay: 1.2 + index * 0.15, ease: "easeOut" }}
              className="absolute right-32 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-current to-current origin-left"
              style={{ color: collab.color }}
            />
          )}

          {isAnimating && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: -32, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1, delay: 1.8 + index * 0.15, ease: "easeInOut" }}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]"
              style={{ backgroundColor: collab.color }}
            />
          )}

          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 + index * 0.1, type: "spring", stiffness: 150 }}
            className="relative w-64 px-5 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                  style={{ backgroundColor: `${collab.color}20`, color: collab.color }}
                >
                  {collab.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-white">{collab.name}</div>
                  <div className="text-xs text-white/50">Collaborator</div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-2xl font-['Epilogue'] font-bold"
                  style={{ color: collab.color }}
                >
                  {collab.percentage}%
                </div>
                <div className="text-xs text-white/50 mt-0.5">
                  ${(12450 * collab.percentage / 100).toLocaleString()}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-8 px-6 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
      >
        <div className="text-center">
          <div className="text-xs text-white/50 mb-1">Total Split</div>
          <div className="font-semibold text-white">100%</div>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <div className="text-xs text-white/50 mb-1">Processing</div>
          <div className="font-semibold text-[#00d4ff]">Automatic</div>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <div className="text-xs text-white/50 mb-1">Disputes</div>
          <div className="font-semibold text-white">Zero</div>
        </div>
      </motion.div>
    </div>
  );
}