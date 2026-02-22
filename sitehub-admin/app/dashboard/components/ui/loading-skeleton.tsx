"use client";

import { motion } from "framer-motion";

export function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded-lg w-48 shimmer" />
        <div className="h-4 bg-gray-200 rounded w-96 shimmer" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-20 shimmer" />
                <div className="h-8 bg-gray-200 rounded w-16 shimmer" />
                <div className="h-3 bg-gray-200 rounded w-24 shimmer" />
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl shimmer" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-md"
          >
            <div className="h-6 bg-gray-200 rounded w-32 mb-6 shimmer" />
            <div className="h-64 bg-gray-100 rounded-lg shimmer" />
          </motion.div>
        ))}
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-md"
          >
            <div className="h-6 bg-gray-200 rounded w-40 mb-4 shimmer" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 shimmer" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
