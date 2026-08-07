import React, { useState, useRef, useEffect } from "react";
import { useNotifications, useMarkRead } from "../../hooks/useNotifications";
import { useLogout } from "../../hooks/useAuth";
import { useAppStore } from "../../store/useAppStore";
import { SearchModal } from "../ui/SearchModal";
import { SparkleButton } from "../ui/SparkleButton";

interface TopbarProps {
	title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
	const logout = useLogout();
	const { isSidebarCollapsed, toggleSidebar } = useAppStore();
	const { data: notificationsList = [] } = useNotifications();
	const markReadMutation = useMarkRead();
	const [showNotif, setShowNotif] = useState(false);
	const [showSearch, setShowSearch] = useState(false);
	const notifRef = useRef<HTMLDivElement>(null);

	const unreadCount = notificationsList.filter(
		(n: { read?: boolean }) => !n.read,
	).length;

	// Keyboard shortcut listener for Ctrl+K / Cmd+K / Slash
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const activeEl = document.activeElement;
			const isInputActive =
				activeEl && ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName);

			if (
				((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") ||
				(!isInputActive && e.key === "/")
			) {
				e.preventDefault();
				setShowSearch((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Close notification popup on outside click
	useEffect(() => {
		if (!showNotif) return;
		const handler = (e: MouseEvent) => {
			if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
				setShowNotif(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [showNotif]);

	const isMac =
		typeof window !== "undefined" &&
		/mac/i.test(navigator.userAgent || navigator.platform);
	const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

	return (
		<header className="topbar">
			<div className="topbar__left">
				<button
					type="button"
					className="topbar__mobile-toggle"
					onClick={toggleSidebar}
					title="Toggle Navigation Menu"
					aria-label="Toggle Navigation Menu"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						style={{ width: 20, height: 20 }}
					>
						<path d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<span className="topbar__title">{title}</span>
				<div
					className="topbar__search"
					onClick={() => setShowSearch(true)}
					style={{ cursor: "pointer" }}
					title={`Search app (${shortcutLabel} or /)`}
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<circle cx="6.5" cy="6.5" r="4.5" />
						<path d="M10.5 10.5L14 14" />
					</svg>
					<input
						placeholder="Search..."
						readOnly
						style={{ cursor: "pointer" }}
					/>
					<span className="topbar__search-shortcut">{shortcutLabel}</span>
				</div>
			</div>
			<div className="topbar__right">
				<div ref={notifRef} style={{ position: "relative" }}>
					<div
						className="topbar__notif"
						onClick={() => setShowNotif((v) => !v)}
					>
						<svg
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M8 1.5a5 5 0 015 5v2.5l1 2H2l1-2V6.5a5 5 0 015-5z" />
							<path d="M6.5 13.5a1.5 1.5 0 003 0" />
						</svg>
						{unreadCount > 0 && (
							<span className="topbar__notif-badge">
								{unreadCount > 99 ? "99+" : unreadCount}
							</span>
						)}
					</div>

					{showNotif && (
						<div
							style={{
								position: "absolute",
								top: "calc(100% + 10px)",
								right: 0,
								width: 320,
								background: "#fff",
								border: "1px solid #e5e7eb",
								borderRadius: 12,
								boxShadow: "0 10px 24px rgba(0,0,0,.08)",
								zIndex: 200,
							}}
						>
							<div
								style={{
									padding: "14px 16px",
									borderBottom: "1px solid #f0f0f0",
									fontWeight: 600,
									fontSize: 13,
								}}
							>
								Notifications
							</div>
							{notificationsList.length === 0 ? (
								<div
									style={{
										padding: "16px",
										fontSize: 12,
										color: "#6b7280",
										textAlign: "center",
									}}
								>
									No notifications
								</div>
							) : (
								notificationsList.map(
									(n: {
										id: string;
										message: string;
										time: string;
										read?: boolean;
									}) => (
										<div
											key={n.id}
											onClick={() => !n.read && markReadMutation.mutate(n.id)}
											style={{
												padding: "10px 16px",
												borderBottom: "1px solid #f9fafb",
												fontSize: 12,
												color: n.read ? "#6b7280" : "#111827",
												background: n.read ? "#fff" : "#f9fafb",
												display: "flex",
												gap: 8,
												alignItems: "flex-start",
												cursor: n.read ? "default" : "pointer",
											}}
										>
											{!n.read && (
												<span
													style={{
														width: 6,
														height: 6,
														borderRadius: "50%",
														background: "#3b82f6",
														marginTop: 4,
														flexShrink: 0,
													}}
												/>
											)}
											<div style={{ flex: 1 }}>
												<div>{n.message}</div>
												<div
													style={{
														color: "#9ca3af",
														fontSize: 11,
														marginTop: 2,
													}}
												>
													{n.time}
												</div>
											</div>
										</div>
									),
								)
							)}
						</div>
					)}
				</div>

				<div
					className="topbar__notif"
					onClick={logout}
					title="Sign out"
					style={{ cursor: "pointer" }}
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						style={{ width: 16, height: 16 }}
					>
						<path d="M6 14H3a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 013 2h3" />
						<path d="M10.5 11l3.5-3-3.5-3M14 8H6" />
					</svg>
				</div>
			</div>
			{showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
		</header>
	);
};
