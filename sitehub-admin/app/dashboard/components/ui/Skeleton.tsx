"use client";


interface SkeletonProps {
	className?: string;
}

export default function Skeleton({ className = "h-4 rounded bg-gray-200" }: SkeletonProps) {
	return <div className={`animate-pulse ${className}`} />;
}
