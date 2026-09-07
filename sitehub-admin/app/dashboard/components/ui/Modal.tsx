"use client";

import { PortalOverlay } from "../PortalOverlay";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Modal({ open, onClose, title, children }: any) {
	if (!open) return null;

	return (
		<PortalOverlay>
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-blue-900/70 to-blue-800/80 backdrop-blur-md" onClick={onClose} />
			<div className="modal-panel relative z-10 max-w-md w-full rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
				{title && <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">{title}</h3>}
				<div>{children}</div>
			</div>
		</div>
		</PortalOverlay>
	);
}

