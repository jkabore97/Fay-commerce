"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Branded loading splash: a real product (a hex nut) spinning inside a metallic
 * ring, with the Fay & Partenaires logo. Steel-themed, shown once per browser
 * session, and skipped entirely for prefers-reduced-motion.
 */
export function Splash() {
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem("fay-splash") === "1";
    } catch {
      seen = false;
    }
    if (seen || reduce) return;
    setShow(true);
    try {
      sessionStorage.setItem("fay-splash", "1");
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setShow(false), 2300);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center steel-texture"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          {/* Spinning product in a metallic ring */}
          <div className="relative flex h-40 w-40 items-center justify-center">
            {/* rotating conic ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, #233cff, #8fb3d5, #12233a, #233cff)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px))",
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}
            />
            {/* spinning nut photo */}
            <motion.div
              className="h-28 w-28 overflow-hidden rounded-full border-4 border-steel-800 bg-white shadow-2xl"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 360 }}
              transition={{
                scale: { type: "spring", stiffness: 160, damping: 14 },
                opacity: { duration: 0.4 },
                rotate: { repeat: Infinity, duration: 2.6, ease: "linear" },
              }}
            >
              <img
                src="/catalog/cat-ecrous.jpg"
                alt=""
                className="h-full w-full object-cover"
              />
            </motion.div>
          </div>

          {/* Logo */}
          <motion.div
            className="mt-8"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <img
              src="/brand/logo-transparent.png"
              alt="Fay & Partenaires"
              className="h-12 w-auto sm:h-14"
            />
          </motion.div>

          <motion.p
            className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-steel-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Commerce Général · Boulonnerie
          </motion.p>

          {/* Progress bar */}
          <motion.div
            className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-steel-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="h-full bg-cobalt-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.9, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
