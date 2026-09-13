"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FayMark } from "./logo";

/**
 * Branded splash overlay. Shows once per browser session (sessionStorage) so it
 * greets a first visit without nagging on every navigation. Honours
 * prefers-reduced-motion by skipping straight through.
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
    const t = setTimeout(() => setShow(false), 1900);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center steel-texture"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
          >
            <FayMark className="h-20 w-20 text-cobalt-500" />
          </motion.div>
          <motion.div
            className="mt-6 text-center"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <p className="font-display text-2xl font-extrabold text-white">
              FAY <span className="text-cobalt-500">&amp;</span> Partenaires
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-steel-300">
              Commerce Général · Boulonnerie
            </p>
          </motion.div>
          <motion.div
            className="mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-steel-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="h-full bg-cobalt-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
