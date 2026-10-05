"use client";

import { PortalOverlay } from "../PortalOverlay";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Modal({ open, onClose, title, children }: any) {
	if (!open) return null;

	return (
		<PortalOverlay>
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-gray-900/50" onClick={onClose} aria-hidden />
			<div className="modal-panel relative z-10 max-w-md w-full rounded-xl bg-white border border-gray-200 shadow-xl p-6 max-h-[90vh] overflow-y-auto">
				{title && <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">{title}</h3>}
				<div>{children}</div>
			</div>
		</div>
		</PortalOverlay>
	);
}

