"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Thin client-component boundary around framer-motion so server components
 * (Hero, HowItWorks) can wrap static content in a scroll-triggered
 * fade/slide without themselves becoming client components.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
