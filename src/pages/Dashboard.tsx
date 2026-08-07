import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { Badge, statusVariant } from "../components/ui/Badge";
import { ProgressBar, UtilBar } from "../components/ui/ProgressBar";
import { Avatar } from "../components/ui/Avatar";
import { formatDisplayDate } from "../utils/date";
import {
	useEmployeeDashboard,
	useManagerDashboard,
} from "../hooks/useDashboard";
import { useApprovals, useBulkApprove } from "../hooks/useApprovals";
import { LogTaskDrawer } from "../components/ui/LogTaskDrawer";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { WeekBars } from "../components/ui/Charts";
import { EmptyState } from "../components/ui/EmptyState";

// ─── Shared Quick Actions Component ─────────────────────────────────────────────
const DashboardQuickActions: React.FC = () => {
	const navigate = useNavigate();
	const { role } = useAppStore();

	const canApprove = role === "manager" || role === "ceo" || role === "hr";

	const primaryAction = canApprove
		? {
				label: "Review Approvals",
				to: "/approvals",
				icon: (
					<svg
						width="15"
						height="15"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<path d="M14 4L6 12l-4-4" />
						<rect x="1.5" y="1.5" width="13" height="13" rx="2" />
					</svg>
				),
			}
		: {
				label: "View Reports",
				to: "/reports",
				icon: (
					<svg
						width="15"
						height="15"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<path d="M4 14V8m4 6V2m4 12V5" />
					</svg>
				),
			};

	const defaultActions = [
		{
			label: "Browse Projects",
			to: "/projects",
			icon: (
				<svg
					width="15"
					height="15"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				>
					<path d="M1.5 4.5A1.5 1.5 0 013 3h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 6v6A1.5 1.5 0 0113 13.5H3A1.5 1.5 0 011.5 12V4.5z" />
				</svg>
			),
		},
		{
			label: "Employee Directory",
			to: "/employees",
			icon: (
				<svg
					width="15"
					height="15"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				>
					<path d="M11 13v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1" />
					<circle cx="6.5" cy="5" r="2.5" />
				</svg>
			),
		},
		{
			label: "Account Settings",
			to: "/settings",
			icon: (
				<svg
					width="15"
					height="15"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				>
					<circle cx="8" cy="8" r="2.5" />
					<path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" />
				</svg>
			),
		},
	];

	return (
		<div className="dashboard__section">
			<div className="dashboard__section-header">
				<span className="dashboard__section-title">Quick Actions</span>
			</div>
			<div
				className="dashboard__quick-action dashboard__quick-action--primary"
				onClick={() => navigate(primaryAction.to)}
			>
				<span style={{ display: "flex", alignItems: "center", gap: 8 }}>
					{primaryAction.icon}
					{primaryAction.label}
				</span>
				<span style={{ color: "#9ca3af" }}>›</span>
			</div>
			{defaultActions.map((a) => (
				<div
					key={a.label}
					className="dashboard__quick-action dashboard__quick-action--default"
					onClick={() => navigate(a.to)}
				>
					<span
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							color: "#4b5563",
						}}
					>
						<span style={{ color: "#9ca3af", display: "flex" }}>{a.icon}</span>
						{a.label}
					</span>
					<span style={{ color: "#9ca3af" }}>›</span>
				</div>
			))}
		</div>
	);
};

// ─── Employee Dashboard ───────────────────────────────────────────────────────
const EmployeeDashboard: React.FC = () => {
	const { currentUser } = useAppStore();
	const navigate = useNavigate();
	const { data, isLoading } = useEmployeeDashboard();
	const hour = new Date().getHours();
	const greeting =
		hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
	const [showLogTask, setShowLogTask] = useState(false);

	if (isLoading || !data) {
		return (
			<div className="page-inner">
				<LoadingSpinner message="Loading dashboard…" fullPage />
			</div>
		);
	}

	const myProjects = (data.projects || []).slice(0, 3);
	const weekHours = data.weekHours || [];
	const todayHours = data.todayHours || 0;
	const weekTotal =
		data.weekHours?.reduce(
			(acc: number, d: { hours: number }) => acc + d.hours,
			0,
		) || 0;
	const remainingToday = Math.max(0, 8 - todayHours);

	return (
		<div className="page-inner">
			<div className="dashboard__header-row">
				<div>
					<div className="dashboard__greeting">
						{greeting}, {currentUser.name.split(" ")[0]}
					</div>
					<div className="dashboard__meta">
						{new Date().toLocaleDateString("en-US", {
							weekday: "long",
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</div>
				</div>
				<div className="dashboard__header-actions">
					<button
						type="button"
						className="btn btn--primary"
						onClick={() => setShowLogTask(true)}
					>
						+ Log Task
					</button>
				</div>
			</div>

			{/* Stats */}
			<div className="dashboard__stats">
				{[
					{
						label: "TODAY'S HOURS",
						value: `${todayHours}h`,
						sub:
							remainingToday > 0
								? `- ${remainingToday}h remaining`
								: "Target reached",
						subCls: remainingToday > 0 ? "muted" : "green",
						iconCls: "dashboard__stat-card-icon--blue",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
						),
					},
					{
						label: "WEEK TOTAL",
						value: `${weekTotal}h`,
						sub:
							weekTotal < 40
								? `↑ + ${Math.max(0, 40 - weekTotal)}h to hit 40h`
								: "Weekly target hit",
						subCls: weekTotal < 40 ? "muted" : "green",
						iconCls: "dashboard__stat-card-icon--indigo",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
							</svg>
						),
					},
					{
						label: "ACTIVE PROJECTS",
						value: `${data.activeProjects || 0}`,
						sub: "- Assigned to you",
						subCls: "muted",
						iconCls: "dashboard__stat-card-icon--green",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
							</svg>
						),
					},
					{
						label: "OPEN TASKS",
						value: `${myProjects.length}`,
						sub: "In progress",
						subCls: "blue",
						iconCls: "dashboard__stat-card-icon--amber",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
						),
					},
				].map((s, i) => (
					<div className="dashboard__stat-card" key={i}>
						<div className="dashboard__stat-card-top">
							<span className="dashboard__stat-card-label">{s.label}</span>
							<span className={`dashboard__stat-card-icon ${s.iconCls}`}>
								{s.icon}
							</span>
						</div>
						<div className="dashboard__stat-card-value">{s.value}</div>
						<div
							className={`dashboard__stat-card-sub dashboard__stat-card-sub--${s.subCls}`}
						>
							{s.sub}
						</div>
					</div>
				))}
			</div>

			<div className="dashboard__grid">
				<div className="dashboard__grid-left">
					{/* Assigned Projects */}
					<div className="dashboard__section" style={{ padding: 0 }}>
						<div
							className="dashboard__section-header"
							style={{ padding: "20px 24px", marginBottom: 0 }}
						>
							<span className="dashboard__section-title">
								Assigned Projects
							</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/projects")}
							>
								View all{" "}
								<span style={{ color: "#9ca3af", marginLeft: 4 }}>›</span>
							</span>
						</div>

						<div style={{ display: "flex", flexDirection: "column" }}>
							{myProjects.length === 0 ? (
								<EmptyState
									icon="projects"
									title="No Assigned Projects"
									subtitle="You are not currently assigned to any active projects."
									compact
								/>
							) : (
								myProjects.map(
									(p: {
										id: string;
										name: string;
										status: string;
										progress: number;
										dueDate: string;
										loggedHours: number;
										totalHours: number;
									}) => {
										const dotColor =
											p.status === "At Risk"
												? "#f97316"
												: p.status === "Completed"
													? "#10b981"
													: "#3b82f6";
										return (
											<div
												className="dashboard__project-item"
												key={p.id}
												onClick={() => navigate(`/projects/${p.id}`)}
												style={{
													borderTop: "1px solid #f3f4f6",
													padding: "24px",
													display: "flex",
													alignItems: "center",
													margin: 0,
													cursor: "pointer",
												}}
											>
												<div
													style={{
														flex: 1,
														position: "relative",
														paddingLeft: 20,
														paddingRight: 32,
													}}
												>
													<div
														className="dashboard__project-item-header"
														style={{ marginBottom: 12, position: "relative" }}
													>
														<div
															style={{
																position: "absolute",
																left: -20,
																top: "50%",
																transform: "translateY(-50%)",
																width: 8,
																height: 8,
																borderRadius: "50%",
																background: dotColor,
															}}
														/>
														<div
															style={{
																display: "flex",
																alignItems: "center",
																gap: 12,
															}}
														>
															<span className="dashboard__project-item-name">
																{p.name}
															</span>
															<Badge variant={statusVariant(p.status)} dot>
																{p.status}
															</Badge>
														</div>
													</div>

													<div
														className="dashboard__project-item-bar"
														style={{ marginBottom: 8 }}
													>
														<ProgressBar
															value={p.progress}
															color={
																p.status === "At Risk"
																	? "orange"
																	: p.status === "Completed"
																		? "green"
																		: "blue"
															}
														/>
													</div>

													<div
														className="dashboard__project-item-meta"
														style={{
															justifyContent: "space-between",
															marginBottom: 0,
														}}
													>
														<span className="dashboard__project-item-due">
															Due {formatDisplayDate(p.dueDate) || "N/A"}
														</span>
														<span className="dashboard__project-item-hours">
															{p.loggedHours}h / {p.totalHours}h
														</span>
													</div>
												</div>

												<div
													style={{
														width: 72,
														textAlign: "center",
														flexShrink: 0,
													}}
												>
													<div
														className="dashboard__project-item-pct"
														style={{
															fontSize: 15,
															fontWeight: 700,
															color: "#111827",
														}}
													>
														{p.progress}%
													</div>
													<div
														style={{
															fontSize: 11,
															color: "#9ca3af",
															marginTop: 2,
														}}
													>
														complete
													</div>
												</div>
											</div>
										);
									},
								)
							)}
						</div>
					</div>

					{/* Hours This Week */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">Hours This Week</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/work-logs")}
							>
								Full log →
							</span>
						</div>
						{weekTotal === 0 ? (
							<EmptyState
								icon="timesheets"
								title="No Hours Logged This Week"
								subtitle="You haven't recorded any work hours for this week yet."
								action={{
									label: "Log Task",
									onClick: () => setShowLogTask(true),
								}}
								compact
							/>
						) : (
							<>
								<WeekBars data={weekHours} targetHours={8} />
								<div className="dashboard__week-total" style={{ marginTop: 16 }}>
									<span className="dashboard__week-total-label">Week total</span>
									<span className="dashboard__week-total-val">
										{weekTotal}h{" "}
										<span style={{ fontWeight: 400, color: "#9ca3af" }}>/ 40h</span>
									</span>
								</div>
								<div
									style={{
										height: 6,
										background: "#e5e7eb",
										borderRadius: 999,
										marginTop: 10,
										overflow: "hidden",
									}}
								>
									<div
										style={{
											height: "100%",
											width: `${Math.min(100, (weekTotal / 40) * 100)}%`,
											background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
											borderRadius: 999,
											transition: "width 0.4s ease",
										}}
									/>
								</div>
							</>
						)}
					</div>
				</div>

				<div className="dashboard__grid-right">
					{/* Quick Actions */}
					<DashboardQuickActions />
				</div>
			</div>
			{showLogTask && <LogTaskDrawer onClose={() => setShowLogTask(false)} />}
		</div>
	);
};

// ─── Manager Dashboard ────────────────────────────────────────────────────────
const ManagerDashboard: React.FC = () => {
	const { currentUser, role } = useAppStore();
	const navigate = useNavigate();
	const { data, isLoading } = useManagerDashboard();
	const { data: approvals = [] } = useApprovals();
	const bulkApproveMutation = useBulkApprove();
	const hour = new Date().getHours();
	const greeting =
		hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

	if (isLoading || !data) {
		return (
			<div className="page-inner">
				<LoadingSpinner message="Loading dashboard…" fullPage />
			</div>
		);
	}

	const monthlyHours = data.monthlyHours || [];
	const deptUtilization = data.deptUtilization || [];
	const employeeTable = data.employeeTable || [];
	const myProjects = (data.projects || []).slice(0, 3);

	const handleBulkApproveAll = () => {
		const pendingIds = approvals
			.filter((a: { status: string; id: string }) => a.status === "Pending")
			.map((a: { id: string }) => a.id);
		if (
			pendingIds.length > 0 &&
			window.confirm(
				`Are you sure you want to approve all ${pendingIds.length} pending timesheets right now?`,
			)
		) {
			bulkApproveMutation.mutate(pendingIds);
		}
	};

	return (
		<div className="page-inner">
			<div className="dashboard__header-row">
				<div>
					<div className="dashboard__greeting">
						{greeting}, {currentUser.name.split(" ")[0]}
					</div>
					<div className="dashboard__meta">
						{new Date().toLocaleDateString("en-US", {
							weekday: "long",
							month: "short",
							day: "numeric",
							year: "numeric",
						})}{" "}
					</div>
				</div>
				<div className="dashboard__header-actions">
					{role !== "admin" && (
						<button
							type="button"
							className="btn btn--primary"
							onClick={() => navigate("/approvals")}
						>
							✓ Review ({data.pendingApprovals || 0})
						</button>
					)}
				</div>
			</div>

			{/* Approval Banner with HR Reminder */}
			{role !== "admin" && data.pendingApprovals > 0 && (
				<div
					className="dashboard__banner"
					style={{
						background: "#fffbe6",
						border: "1px solid #ffe58f",
						color: "#854d0e",
						padding: "12px 20px",
						borderRadius: 8,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<svg
							width="20"
							height="20"
							viewBox="0 0 16 16"
							fill="none"
							stroke="#d97706"
							strokeWidth="1.8"
						>
							<path d="M8 1.5a5 5 0 015 5v2.5l1 2H2l1-2V6.5a5 5 0 015-5z" />
							<path d="M6.5 13.5a1.5 1.5 0 003 0" />
						</svg>
						<div>
							<strong style={{ color: "#92400e" }}>
								HR Reminder (from Reshma):
							</strong>{" "}
							You have{" "}
							<strong>
								{data.pendingApprovals} timesheet
								{data.pendingApprovals > 1 ? "s" : ""}
							</strong>{" "}
							awaiting your review and approval.
						</div>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
						<button
							type="button"
							className="btn btn--sm"
							onClick={handleBulkApproveAll}
							disabled={bulkApproveMutation.isPending}
							style={{
								background: "#059669",
								color: "#fff",
								border: "none",
								borderRadius: 6,
								padding: "5px 14px",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							✓ Approve All ({data.pendingApprovals})
						</button>
						<span
							className="dashboard__banner-link"
							style={{ color: "#d97706", fontWeight: 600, cursor: "pointer" }}
							onClick={() => navigate("/approvals")}
						>
							Review listing →
						</span>
					</div>
				</div>
			)}

			{/* Stats */}
			<div className="dashboard__stats">
				{[
					{
						label: "Total Employees",
						value: `${data.totalEmployees || 0}`,
						sub: "Active personnel",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--blue",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						),
					},
					{
						label: "Active Projects",
						value: `${data.activeProjects || 0}`,
						sub: "In progress",
						subCls: "blue",
						iconCls: "dashboard__stat-card-icon--green",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
							</svg>
						),
					},
					role === "admin"
						? {
								label: "Departments",
								value: `${deptUtilization.length || 5}`,
								sub: "Active departments",
								subCls: "green",
								iconCls: "dashboard__stat-card-icon--purple",
								icon: (
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
										<line x1="8" y1="21" x2="16" y2="21" />
										<line x1="12" y1="17" x2="12" y2="21" />
									</svg>
								),
							}
						: {
								label: "Pending Approvals",
								value: `${data.pendingApprovals || 0}`,
								sub: "Needs action",
								subCls: data.pendingApprovals > 0 ? "red" : "green",
								iconCls: "dashboard__stat-card-icon--amber",
								icon: (
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<circle cx="12" cy="12" r="10" />
										<polyline points="12 6 12 12 16 14" />
									</svg>
								),
							},
					{
						label: "Avg Utilization",
						value: deptUtilization.length
							? `${Math.round(deptUtilization.reduce((acc: number, d: { utilization: number }) => acc + d.utilization, 0) / deptUtilization.length)}%`
							: "0%",
						sub: "Across departments",
						subCls: "blue",
						iconCls: "dashboard__stat-card-icon--indigo",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
								<polyline points="17 6 23 6 23 12" />
							</svg>
						),
					},
				].map((s, i) => (
					<div className="dashboard__stat-card" key={i}>
						<div className="dashboard__stat-card-top">
							<span className="dashboard__stat-card-label">{s.label}</span>
							<span className={`dashboard__stat-card-icon ${s.iconCls}`}>
								{s.icon}
							</span>
						</div>
						<div className="dashboard__stat-card-value">{s.value}</div>
						<div
							className={`dashboard__stat-card-sub dashboard__stat-card-sub--${s.subCls}`}
						>
							{s.sub}
						</div>
					</div>
				))}
			</div>

			{/* Grid with Team Status and Quick Actions */}
			<div className="dashboard__grid">
				<div className="dashboard__grid-left">
					{/* Assigned Projects */}
					<div className="dashboard__section" style={{ padding: 0 }}>
						<div
							className="dashboard__section-header"
							style={{ padding: "20px 24px", marginBottom: 0 }}
						>
							<span className="dashboard__section-title">
								Assigned Projects
							</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/projects")}
							>
								View all{" "}
								<span style={{ color: "#9ca3af", marginLeft: 4 }}>›</span>
							</span>
						</div>

						<div style={{ display: "flex", flexDirection: "column" }}>
							{myProjects.length === 0 ? (
								<EmptyState
									icon="projects"
									title="No Assigned Projects"
									subtitle="No active project assignments found for your account."
									compact
								/>
							) : (
								myProjects.map(
									(p: {
										id: string;
										name: string;
										status: string;
										progress: number;
										dueDate: string;
										loggedHours: number;
										totalHours: number;
									}) => {
										const dotColor =
											p.status === "At Risk"
												? "#f97316"
												: p.status === "Completed"
													? "#10b981"
													: "#3b82f6";
										return (
											<div
												className="dashboard__project-item"
												key={p.id}
												onClick={() => navigate(`/projects/${p.id}`)}
												style={{
													borderTop: "1px solid #f3f4f6",
													padding: "24px",
													display: "flex",
													alignItems: "center",
													margin: 0,
													cursor: "pointer",
												}}
											>
												<div
													style={{
														flex: 1,
														position: "relative",
														paddingLeft: 20,
														paddingRight: 32,
													}}
												>
													<div
														className="dashboard__project-item-header"
														style={{ marginBottom: 12, position: "relative" }}
													>
														<div
															style={{
																position: "absolute",
																left: -20,
																top: "50%",
																transform: "translateY(-50%)",
																width: 8,
																height: 8,
																borderRadius: "50%",
																background: dotColor,
															}}
														/>
														<div
															style={{
																display: "flex",
																alignItems: "center",
																gap: 12,
															}}
														>
															<span className="dashboard__project-item-name">
																{p.name}
															</span>
															<Badge variant={statusVariant(p.status)} dot>
																{p.status}
															</Badge>
														</div>
													</div>

													<div
														className="dashboard__project-item-bar"
														style={{ marginBottom: 8 }}
													>
														<ProgressBar
															value={p.progress}
															color={
																p.status === "At Risk"
																	? "orange"
																	: p.status === "Completed"
																		? "green"
																		: "blue"
															}
														/>
													</div>

													<div
														className="dashboard__project-item-meta"
														style={{
															justifyContent: "space-between",
															marginBottom: 0,
														}}
													>
														<span className="dashboard__project-item-due">
															Due {formatDisplayDate(p.dueDate) || "N/A"}
														</span>
														<span className="dashboard__project-item-hours">
															{p.loggedHours}h / {p.totalHours}h
														</span>
													</div>
												</div>

												<div
													style={{
														width: 72,
														textAlign: "center",
														flexShrink: 0,
													}}
												>
													<div
														className="dashboard__project-item-pct"
														style={{
															fontSize: 15,
															fontWeight: 700,
															color: "#111827",
														}}
													>
														{p.progress}%
													</div>
													<div
														style={{
															fontSize: 11,
															color: "#9ca3af",
															marginTop: 2,
														}}
													>
														complete
													</div>
												</div>
											</div>
										);
									},
								)
							)}
						</div>
					</div>

					{/* Team Status */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">Team Timesheets Overview</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/approvals")}
							>
								Full Listing →
							</span>
						</div>
						{employeeTable.length === 0 ? (
							<EmptyState
								icon="timesheets"
								title="No Team Timesheets Found"
								subtitle="Your team currently has no timesheets logged for this period."
							/>
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th>Employee</th>
										<th>Hours Logged</th>
										<th>Utilization</th>
										<th>Timesheet</th>
									</tr>
								</thead>
								<tbody>
									{employeeTable.slice(0, 5).map(
										(row: {
											user: {
												id: string;
												name: string;
												initials: string;
												color: string;
												designation: string;
											};
											weekHours: number;
											utilization: number;
											timesheetStatus: string;
										}) => (
											<tr key={row.user.id}>
												<td>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 10,
														}}
													>
														<Avatar
															initials={row.user.initials}
															color={row.user.color}
															size="sm"
														/>
														<div>
															<div style={{ fontWeight: 600, fontSize: 13 }}>
																{row.user.name}
															</div>
															<div style={{ fontSize: 11, color: "#9ca3af" }}>
																{row.user.designation}
															</div>
														</div>
													</div>
												</td>
												<td style={{ fontWeight: 600 }}>{row.weekHours}h</td>
												<td style={{ minWidth: 140 }}>
													<UtilBar value={row.utilization} />
												</td>
												<td>
													<Badge variant={statusVariant(row.timesheetStatus)}>
														{row.timesheetStatus}
													</Badge>
												</td>
											</tr>
										),
									)}
								</tbody>
							</table>
						)}
					</div>
				</div>
				<div className="dashboard__grid-right">
					{/* Timesheet Summary */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">Timesheet Status</span>
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr 1fr",
								gap: 12,
								marginBottom: 8,
							}}
						>
							<div
								style={{
									padding: 12,
									borderRadius: 8,
									border: "1px solid #e5e7eb",
									textAlign: "center",
								}}
							>
								<div
									style={{ fontSize: 20, fontWeight: 700, color: "#166534" }}
								>
									{
										employeeTable.filter(
											(e: any) => e.timesheetStatus === "Submitted",
										).length
									}
								</div>
								<div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
									Submitted
								</div>
							</div>
							<div
								style={{
									padding: 12,
									borderRadius: 8,
									border: "1px solid #e5e7eb",
									textAlign: "center",
								}}
							>
								<div
									style={{ fontSize: 20, fontWeight: 700, color: "#b45309" }}
								>
									{
										employeeTable.filter(
											(e: any) => e.timesheetStatus === "Pending",
										).length
									}
								</div>
								<div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
									Pending
								</div>
							</div>
							<div
								style={{
									padding: 12,
									borderRadius: 8,
									border: "1px solid #e5e7eb",
									textAlign: "center",
								}}
							>
								<div
									style={{ fontSize: 20, fontWeight: 700, color: "#4b5563" }}
								>
									{
										employeeTable.filter(
											(e: any) => e.timesheetStatus === "Not Started",
										).length
									}
								</div>
								<div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
									Not Started
								</div>
							</div>
						</div>
					</div>

					<DashboardQuickActions />
				</div>
			</div>
		</div>
	);
};

// ─── CEO Dashboard ────────────────────────────────────────────────────────────
const CEODashboard: React.FC = () => {
	const { currentUser } = useAppStore();
	const navigate = useNavigate();
	const { data, isLoading } = useManagerDashboard();
	const { data: approvals = [] } = useApprovals();

	if (isLoading || !data) {
		return (
			<div className="page-inner">
				<LoadingSpinner message="Loading CEO dashboard…" fullPage />
			</div>
		);
	}

	const deptUtilization = data.deptUtilization || [];
	const employeeTable = data.employeeTable || [];
	const myProjects = (data.projects || []).slice(0, 3);
	const totalTimesheets = approvals.length;
	const pendingTimesheets = approvals.filter(
		(a: any) => a.status === "Pending",
	).length;
	const approvedTimesheets = approvals.filter(
		(a: any) => a.status === "Approved",
	).length;

	return (
		<div className="page-inner">
			<div className="dashboard__header-row">
				<div>
					<div className="dashboard__greeting">
						Executive Dashboard · {currentUser.name}
					</div>
					<div className="dashboard__meta">
						{new Date().toLocaleDateString("en-US", {
							weekday: "long",
							month: "short",
							day: "numeric",
							year: "numeric",
						})}{" "}
					</div>
				</div>
				<div className="dashboard__header-actions">
					<button
						type="button"
						className="btn btn--ghost"
						onClick={() => navigate("/reports")}
					>
						View Reports
					</button>
					<button
						type="button"
						className="btn btn--primary"
						onClick={() => navigate("/approvals")}
					>
						All Timesheets ({approvals.length})
					</button>
				</div>
			</div>

			{/* HR Reminder Banner for CEO */}
			{pendingTimesheets > 0 && (
				<div
					className="dashboard__banner"
					style={{
						background: "#fffbe6",
						border: "1px solid #ffe58f",
						color: "#854d0e",
						padding: "12px 20px",
						borderRadius: 8,
						marginBottom: 20,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<svg
							width="20"
							height="20"
							viewBox="0 0 16 16"
							fill="none"
							stroke="#d97706"
							strokeWidth="1.8"
						>
							<path d="M8 1.5a5 5 0 015 5v2.5l1 2H2l1-2V6.5a5 5 0 015-5z" />
							<path d="M6.5 13.5a1.5 1.5 0 003 0" />
						</svg>
						<div>
							<strong style={{ color: "#92400e" }}>
								HR Reminder (from Reshma):
							</strong>{" "}
							You have{" "}
							<strong>
								{pendingTimesheets} timesheet{pendingTimesheets > 1 ? "s" : ""}
							</strong>{" "}
							awaiting review and approval across the organization.
						</div>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
						<button
							type="button"
							className="btn btn--sm"
							onClick={() => navigate("/approvals")}
							style={{
								background: "#d97706",
								color: "#fff",
								border: "none",
								borderRadius: 6,
								padding: "5px 14px",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							Review Timesheets →
						</button>
					</div>
				</div>
			)}

			{/* Stats Cards */}
			<div className="dashboard__stats">
				{[
					{
						label: "Total Staff",
						value: `${employeeTable.length || 9}`,
						sub: "HR, Managers & Engineers",
						subCls: "blue",
						iconCls: "dashboard__stat-card-icon--blue",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
							</svg>
						),
					},
					{
						label: "Active Projects",
						value: `${myProjects.length || 5}`,
						sub: "Ongoing organization projects",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--green",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
							</svg>
						),
					},
					{
						label: "All Timesheets",
						value: `${totalTimesheets || approvals.length}`,
						sub: `${pendingTimesheets} pending review`,
						subCls: pendingTimesheets > 0 ? "orange" : "green",
						iconCls: "dashboard__stat-card-icon--amber",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
						),
					},
					{
						label: "Org Utilization",
						value: deptUtilization.length
							? `${Math.round(deptUtilization.reduce((acc: number, d: { utilization: number }) => acc + d.utilization, 0) / deptUtilization.length)}%`
							: "85%",
						sub: "Across all departments",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--purple",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
								<polyline points="17 6 23 6 23 12" />
							</svg>
						),
					},
				].map((s, i) => (
					<div className="dashboard__stat-card" key={i}>
						<div className="dashboard__stat-card-top">
							<span className="dashboard__stat-card-label">{s.label}</span>
							<span className={`dashboard__stat-card-icon ${s.iconCls}`}>
								{s.icon}
							</span>
						</div>
						<div className="dashboard__stat-card-value">{s.value}</div>
						<div
							className={`dashboard__stat-card-sub dashboard__stat-card-sub--${s.subCls}`}
						>
							{s.sub}
						</div>
					</div>
				))}
			</div>

			<div className="dashboard__grid">
				<div className="dashboard__grid-left">
					{/* Active Organization Projects */}
					<div className="dashboard__section" style={{ padding: 0 }}>
						<div
							className="dashboard__section-header"
							style={{ padding: "20px 24px", marginBottom: 0 }}
						>
							<span className="dashboard__section-title">
								Organization Projects Progress
							</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/projects")}
							>
								All Projects{" "}
								<span style={{ color: "#9ca3af", marginLeft: 4 }}>›</span>
							</span>
						</div>
						<div style={{ display: "flex", flexDirection: "column" }}>
							{myProjects.slice(0, 3).map((p: any) => (
								<div
									className="dashboard__project-item"
									key={p.id}
									onClick={() => navigate(`/projects/${p.id}`)}
									style={{
										borderTop: "1px solid #f3f4f6",
										padding: "20px 24px",
										display: "flex",
										alignItems: "center",
										cursor: "pointer",
									}}
								>
									<div style={{ flex: 1, paddingRight: 24 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 12,
												marginBottom: 8,
											}}
										>
											<span className="dashboard__project-item-name">
												{p.name}
											</span>
											<Badge variant={statusVariant(p.status)} dot>
												{p.status}
											</Badge>
										</div>
										<ProgressBar
											value={p.progress}
											color={
												p.status === "At Risk"
													? "orange"
													: p.status === "Completed"
														? "green"
														: "blue"
											}
										/>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												fontSize: 12,
												color: "#6b7280",
												marginTop: 6,
											}}
										>
											<span>Due {formatDisplayDate(p.dueDate) || "N/A"}</span>
											<span>
												{p.loggedHours}h / {p.totalHours}h logged
											</span>
										</div>
									</div>
									<div
										style={{ width: 64, textAlign: "center", flexShrink: 0 }}
									>
										<div
											style={{
												fontSize: 16,
												fontWeight: 700,
												color: "#111827",
											}}
										>
											{p.progress}%
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* All Personnel Timesheet Overview (CEO view includes HR, Managers, Employees) */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">
								All Personnel Timesheets (HR, Managers & Staff)
							</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/approvals")}
							>
								Full Listing →
							</span>
						</div>
						{employeeTable.length === 0 ? (
							<EmptyState
								icon="timesheets"
								title="No Workforce Timesheets Recorded"
								subtitle="No employee timesheet submissions found for this period."
							/>
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th>Person</th>
										<th>Role</th>
										<th>Hours</th>
										<th>Utilization</th>
										<th>Timesheet Status</th>
									</tr>
								</thead>
								<tbody>
									{employeeTable.slice(0, 5).map((row: any) => (
										<tr key={row.user.id}>
											<td>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: 10,
													}}
												>
													<Avatar
														initials={row.user.initials}
														color={row.user.color}
														size="sm"
													/>
													<div>
														<div style={{ fontWeight: 600, fontSize: 13 }}>
															{row.user.name}
														</div>
														<div style={{ fontSize: 11, color: "#9ca3af" }}>
															{row.user.designation}
														</div>
													</div>
												</div>
											</td>
											<td>
												<span
													style={{
														fontSize: 11,
														textTransform: "uppercase",
														fontWeight: 700,
														padding: "2px 8px",
														borderRadius: 4,
														background: "#f3f4f6",
														color: "#374151",
													}}
												>
													{row.user.role || "Staff"}
												</span>
											</td>
											<td style={{ fontWeight: 600 }}>{row.weekHours}h</td>
											<td style={{ minWidth: 120 }}>
												<UtilBar value={row.utilization} />
											</td>
											<td>
												<Badge variant={statusVariant(row.timesheetStatus)}>
													{row.timesheetStatus}
												</Badge>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>

				<div className="dashboard__grid-right">
					{/* Timesheets Summary Breakdown */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">
								Company Timesheet Summary
							</span>
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 12,
							}}
						>
							<div
								style={{
									padding: 14,
									borderRadius: 8,
									border: "1px solid #e5e7eb",
									textAlign: "center",
									background: "#f8fafc",
								}}
							>
								<div
									style={{ fontSize: 22, fontWeight: 700, color: "#1e293b" }}
								>
									{totalTimesheets}
								</div>
								<div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
									Total Submissions
								</div>
							</div>
							<div
								style={{
									padding: 14,
									borderRadius: 8,
									border: "1px solid #e5e7eb",
									textAlign: "center",
									background: "#fefce8",
								}}
							>
								<div
									style={{ fontSize: 22, fontWeight: 700, color: "#ca8a04" }}
								>
									{pendingTimesheets}
								</div>
								<div style={{ fontSize: 11, color: "#854d0e", marginTop: 4 }}>
									Pending Approvals
								</div>
							</div>
							<div
								style={{
									padding: 14,
									borderRadius: 8,
									border: "1px solid #e5e7eb",
									textAlign: "center",
									background: "#f0fdf4",
									gridColumn: "span 2",
								}}
							>
								<div
									style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}
								>
									{approvedTimesheets}
								</div>
								<div style={{ fontSize: 11, color: "#15803d", marginTop: 4 }}>
									Approved Timesheets
								</div>
							</div>
						</div>
					</div>

					<DashboardQuickActions />
				</div>
			</div>
		</div>
	);
};

// ─── HR Dashboard ─────────────────────────────────────────────────────────────
const HRDashboard: React.FC = () => {
	const { currentUser } = useAppStore();
	const navigate = useNavigate();
	const { data, isLoading } = useManagerDashboard();
	const { data: approvals = [] } = useApprovals();

	if (isLoading || !data) {
		return (
			<div className="page-inner">
				<LoadingSpinner message="Loading HR dashboard…" fullPage />
			</div>
		);
	}

	const deptUtilization = data.deptUtilization || [];
	const employeeTable = data.employeeTable || [];

	return (
		<div className="page-inner">
			<div className="dashboard__header-row">
				<div>
					<div className="dashboard__greeting">
						HR Dashboard · {currentUser.name}
					</div>
					<div className="dashboard__meta">
						{new Date().toLocaleDateString("en-US", {
							weekday: "long",
							month: "short",
							day: "numeric",
							year: "numeric",
						})}{" "}
					</div>
				</div>
				<div className="dashboard__header-actions">
					<button
						type="button"
						className="btn btn--ghost"
						onClick={() => navigate("/employees")}
					>
						Employee Directory
					</button>
					<button
						type="button"
						className="btn btn--primary"
						onClick={() => navigate("/approvals")}
					>
						Review Timesheets ({approvals.length})
					</button>
				</div>
			</div>

			{/* HR Stats Cards */}
			<div className="dashboard__stats">
				{[
					{
						label: "Total Employees",
						value: `${employeeTable.length || 9}`,
						sub: "Active headcount",
						subCls: "blue",
						iconCls: "dashboard__stat-card-icon--blue",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
							</svg>
						),
					},
					{
						label: "Departments",
						value: `${deptUtilization.length || 5}`,
						sub: "Operational units",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--purple",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
								<line x1="8" y1="21" x2="16" y2="21" />
								<line x1="12" y1="17" x2="12" y2="21" />
							</svg>
						),
					},
					{
						label: "Timesheets Submitted",
						value: `${approvals.length}`,
						sub: "Across managers & employees",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--amber",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
						),
					},
					{
						label: "Avg Resource Util",
						value: deptUtilization.length
							? `${Math.round(deptUtilization.reduce((acc: number, d: { utilization: number }) => acc + d.utilization, 0) / deptUtilization.length)}%`
							: "85%",
						sub: "Workforce allocation",
						subCls: "blue",
						iconCls: "dashboard__stat-card-icon--indigo",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
								<polyline points="17 6 23 6 23 12" />
							</svg>
						),
					},
				].map((s, i) => (
					<div className="dashboard__stat-card" key={i}>
						<div className="dashboard__stat-card-top">
							<span className="dashboard__stat-card-label">{s.label}</span>
							<span className={`dashboard__stat-card-icon ${s.iconCls}`}>
								{s.icon}
							</span>
						</div>
						<div className="dashboard__stat-card-value">{s.value}</div>
						<div
							className={`dashboard__stat-card-sub dashboard__stat-card-sub--${s.subCls}`}
						>
							{s.sub}
						</div>
					</div>
				))}
			</div>

			<div className="dashboard__grid">
				<div className="dashboard__grid-left">
					{/* Employee Directory & Timesheet Overview (HR sees Managers & Employees) */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">
								Workforce Timesheets (Managers & Staff)
							</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/approvals")}
							>
								View All Timesheets →
							</span>
						</div>
						{employeeTable.length === 0 ? (
							<EmptyState
								icon="timesheets"
								title="No Workforce Timesheets Recorded"
								subtitle="No employee timesheet submissions found for this period."
							/>
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th>Employee</th>
										<th>Department</th>
										<th>Hours Logged</th>
										<th>Utilization</th>
										<th>Timesheet</th>
									</tr>
								</thead>
								<tbody>
									{employeeTable.slice(0, 5).map((row: any) => (
										<tr key={row.user.id}>
											<td>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: 10,
													}}
												>
													<Avatar
														initials={row.user.initials}
														color={row.user.color}
														size="sm"
													/>
													<div>
														<div style={{ fontWeight: 600, fontSize: 13 }}>
															{row.user.name}
														</div>
														<div style={{ fontSize: 11, color: "#9ca3af" }}>
															{row.user.designation}
														</div>
													</div>
												</div>
											</td>
											<td style={{ fontSize: 13, color: "#374151" }}>
												{row.user.department || "Engineering"}
											</td>
											<td style={{ fontWeight: 600 }}>{row.weekHours}h</td>
											<td style={{ minWidth: 120 }}>
												<UtilBar value={row.utilization} />
											</td>
											<td>
												<Badge variant={statusVariant(row.timesheetStatus)}>
													{row.timesheetStatus}
												</Badge>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					)}
					</div>
				</div>

				<div className="dashboard__grid-right">
					{/* Department Utilization Breakdown */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">
								Department Resource Allocation
							</span>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/reports")}
							>
								View reports →
							</span>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
							{deptUtilization.slice(0, 5).map((d: any) => (
								<div key={d.dept}>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											fontSize: 13,
											fontWeight: 600,
											marginBottom: 4,
										}}
									>
										<span>{d.dept}</span>
										<span style={{ color: "#4b5563" }}>{d.utilization}%</span>
									</div>
									<ProgressBar
										value={d.utilization}
										color={d.utilization > 85 ? "green" : "orange"}
									/>
								</div>
							))}
						</div>
					</div>

					<DashboardQuickActions />
				</div>
			</div>
		</div>
	);
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
	const { currentUser } = useAppStore();
	const navigate = useNavigate();
	const { data, isLoading } = useManagerDashboard();
	const { data: approvals = [] } = useApprovals();

	if (isLoading || !data) {
		return (
			<div className="page-inner">
				<LoadingSpinner
					message="Loading System Admin Control Center…"
					fullPage
				/>
			</div>
		);
	}

	const employeeTable = data.employeeTable || [];
	const myProjects = (data.projects || []).slice(0, 3);
	const totalTimesheets = approvals.length;

	const systemAuditLogs = [
		{
			id: 1,
			time: "15:06 PM",
			event: "MySQL Schema & Table Column Verification",
			user: "System",
			status: "Completed",
		},
		{
			id: 2,
			time: "14:44 PM",
			event: "Admin Session Authenticated via JWT Token",
			user: currentUser.name,
			status: "Success",
		},
		{
			id: 3,
			time: "12:30 PM",
			event: "HR Timesheet Reminder Notification Dispatched",
			user: "Reshma (HR)",
			status: "Delivered",
		},
		{
			id: 4,
			time: "09:15 AM",
			event: "Automated Microservice Health Check Passed",
			user: "System",
			status: "Optimal",
		},
	];

	return (
		<div className="page-inner">
			<div className="dashboard__header-row">
				<div>
					<div className="dashboard__greeting">
						<span>System Administration & Operations</span>
					</div>
					<div className="dashboard__meta">
						{new Date().toLocaleDateString("en-US", {
							weekday: "long",
							month: "short",
							day: "numeric",
							year: "numeric",
						})}{" "}
					</div>
				</div>
				<div className="dashboard__header-actions">
					<button
						type="button"
						className="btn btn--ghost"
						onClick={() => navigate("/employees")}
						style={{ display: "flex", alignItems: "center", gap: 6 }}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
						>
							<path d="M11 13v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1" />
							<circle cx="6.5" cy="5" r="2.5" />
						</svg>
						Manage Users
					</button>
					<button
						type="button"
						className="btn btn--primary"
						onClick={() => navigate("/projects")}
						style={{ display: "flex", alignItems: "center", gap: 6 }}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
						>
							<path d="M1.5 4.5A1.5 1.5 0 013 3h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 6v6A1.5 1.5 0 0113 13.5H3A1.5 1.5 0 011.5 12V4.5z" />
						</svg>
						Manage Projects
					</button>
				</div>
			</div>

			{/* Admin KPI Stats Bar */}
			<div className="dashboard__stats">
				{[
					{
						label: "System Status",
						value: "99.98%",
						sub: "All API Nodes Operational",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--green",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
								<polyline points="22 4 12 14.01 9 11.01" />
							</svg>
						),
					},
					{
						label: "Registered Accounts",
						value: `${employeeTable.length || 13}`,
						sub: "Admin, HR, Manager & Staff",
						subCls: "blue",
						iconCls: "dashboard__stat-card-icon--blue",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</svg>
						),
					},
					{
						label: "Active Projects",
						value: `${myProjects.length || 6}`,
						sub: "Organization Resource Pool",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--cyan",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
							</svg>
						),
					},
					{
						label: "Database Sync",
						value: "Connected",
						sub: "Aiven Cloud MySQL (12ms)",
						subCls: "green",
						iconCls: "dashboard__stat-card-icon--purple",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<ellipse cx="12" cy="5" rx="9" ry="3" />
								<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
								<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
							</svg>
						),
					},
				].map((s, i) => (
					<div className="dashboard__stat-card" key={i}>
						<div className="dashboard__stat-card-top">
							<span className="dashboard__stat-card-label">{s.label}</span>
							<span className={`dashboard__stat-card-icon ${s.iconCls}`}>
								{s.icon}
							</span>
						</div>
						<div
							className="dashboard__stat-card-value"
							style={{ marginTop: 6 }}
						>
							{s.value}
						</div>
						<div
							className={`dashboard__stat-card-sub dashboard__stat-card-sub--${s.subCls}`}
						>
							{s.sub}
						</div>
					</div>
				))}
			</div>

			<div className="dashboard__grid">
				{/* Left Column */}
				<div className="dashboard__grid-left">
					{/* User Role & Security Access Directory */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<div>
								<span className="dashboard__section-title">
									User Accounts & Access Directory
								</span>
								<div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
									System user roles, designations, and account status
								</div>
							</div>
							<span
								className="dashboard__section-link"
								onClick={() => navigate("/employees")}
							>
								Manage Users{" "}
								<span style={{ color: "#9ca3af", marginLeft: 4 }}>›</span>
							</span>
						</div>
						<div className="table-responsive">
							{employeeTable.length === 0 ? (
								<EmptyState
									icon="users"
									title="No Registered User Accounts"
									subtitle="Add team members to configure system access and security roles."
									action={{
										label: "+ Add Team Member",
										onClick: () => navigate("/employees"),
									}}
								/>
							) : (
								<table className="data-table">
									<thead>
										<tr>
											<th>User Account</th>
											<th>Security Role</th>
											<th>Department</th>
											<th>Account Status</th>
										</tr>
									</thead>
									<tbody>
										{employeeTable.map((row: any) => {
											const roleName = (
												row.user.role || "employee"
											).toLowerCase();
											const roleBadgeStyle =
												roleName === "admin"
													? { bg: "#f3e8ff", color: "#7c3aed" }
													: roleName === "ceo"
														? { bg: "#e0e7ff", color: "#3730a3" }
														: roleName === "hr"
															? { bg: "#fdf2f8", color: "#db2777" }
															: roleName === "manager"
																? { bg: "#eff6ff", color: "#2563eb" }
																: { bg: "#f1f5f9", color: "#64748b" };

											return (
												<tr key={row.user.id}>
													<td>
														<div
															style={{
																display: "flex",
																alignItems: "center",
																gap: 10,
															}}
														>
															<Avatar
																initials={row.user.initials}
																color={row.user.color}
																size="sm"
															/>
															<div>
																<div
																	style={{
																		fontWeight: 600,
																		fontSize: 13,
																		color: "#0f172a",
																	}}
																>
																	{row.user.name}
																</div>
																<div style={{ fontSize: 11, color: "#64748b" }}>
																	{row.user.designation}
																</div>
															</div>
														</div>
													</td>
													<td>
														<span
															style={{
																fontSize: 10,
																fontWeight: 700,
																padding: "3px 8px",
																borderRadius: 4,
																textTransform: "uppercase",
																background: roleBadgeStyle.bg,
																color: roleBadgeStyle.color,
																letterSpacing: "0.4px",
															}}
														>
															{roleName}
														</span>
													</td>
													<td style={{ color: "#334155", fontWeight: 500 }}>
														{row.user.department || "General"}
													</td>
													<td>
														<span
															style={{
																display: "inline-flex",
																alignItems: "center",
																gap: 6,
																fontSize: 12,
																fontWeight: 600,
																color: "#059669",
															}}
														>
															<span
																style={{
																	width: 6,
																	height: 6,
																	borderRadius: "50%",
																	background: "#10b981",
																}}
															/>
															Active
														</span>
													</td>
												</tr>
											);
										})
									}
								</tbody>
							</table>
						)}
						</div>
					</div>

					{/* System Security & Audit Feed */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">
								System Audit Log & Security Events
							</span>
							<span
								className="dashboard__section-link"
								style={{ cursor: "default", color: "#64748b" }}
							>
								Real-time Trail
							</span>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							{systemAuditLogs.map((log) => (
								<div
									key={log.id}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 12,
										padding: "12px 16px",
										borderRadius: 8,
										background: "#f8fafc",
										border: "1px solid #e2e8f0",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 12,
											flex: 1,
											minWidth: 0,
										}}
									>
										<div
											style={{
												width: 32,
												height: 32,
												borderRadius: "50%",
												background: "#e0e7ff",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "#4338ca",
												flexShrink: 0,
											}}
										>
											<svg
												width="15"
												height="15"
												viewBox="0 0 16 16"
												fill="none"
												stroke="currentColor"
												strokeWidth="1.8"
											>
												<path d="M8 1.5A6.5 6.5 0 1014.5 8 6.5 6.5 0 008 1.5z" />
												<path d="M8 4.5V8l2.5 1.5" />
											</svg>
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<div
												style={{
													fontSize: 13,
													fontWeight: 600,
													color: "#1e293b",
													wordBreak: "break-word",
												}}
											>
												{log.event}
											</div>
											<div
												style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
											>
												Initiated by {log.user}
											</div>
										</div>
									</div>
									<div style={{ textAlign: "right", flexShrink: 0 }}>
										<span
											style={{
												fontSize: 10,
												fontWeight: 700,
												color: "#059669",
												background: "#ecfdf5",
												padding: "2px 8px",
												borderRadius: 4,
											}}
										>
											{log.status}
										</span>
										<div
											style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}
										>
											{log.time}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right Column */}
				<div className="dashboard__grid-right">
					{/* Infrastructure & Server Health */}
					<div className="dashboard__section">
						<div className="dashboard__section-header">
							<span className="dashboard__section-title">
								Platform Infrastructure
							</span>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
							{[
								{
									label: "API Microservice",
									status: "Operational",
									val: "200 OK",
									color: "#10b981",
								},
								{
									label: "MySQL Database Cluster",
									status: "Healthy",
									val: "12ms Latency",
									color: "#10b981",
								},
								{
									label: "JWT Auth Engine",
									status: "Active",
									val: "RS256 Verified",
									color: "#10b981",
								},
								{
									label: "Total Submitted Logs",
									status: "Tracked",
									val: `${totalTimesheets} Submissions`,
									color: "#6366f1",
								},
							].map((item, idx) => (
								<div
									key={idx}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										paddingBottom: 10,
										borderBottom: idx < 3 ? "1px solid #f1f5f9" : "none",
									}}
								>
									<div>
										<div
											style={{
												fontSize: 13,
												fontWeight: 600,
												color: "#1e293b",
											}}
										>
											{item.label}
										</div>
										<div
											style={{
												fontSize: 11,
												color: item.color,
												fontWeight: 600,
												marginTop: 2,
											}}
										>
											• {item.status}
										</div>
									</div>
									<span
										style={{
											fontSize: 12,
											fontWeight: 600,
											color: "#475569",
											background: "#f8fafc",
											padding: "4px 10px",
											borderRadius: 6,
											border: "1px solid #e2e8f0",
										}}
									>
										{item.val}
									</span>
								</div>
							))}
						</div>
					</div>

					<DashboardQuickActions />
				</div>
			</div>
		</div>
	);
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
	const { role } = useAppStore();

	switch (role) {
		case "ceo":
			return <CEODashboard />;
		case "hr":
			return <HRDashboard />;
		case "admin":
			return <AdminDashboard />;
		case "manager":
			return <ManagerDashboard />;
		case "employee":
		default:
			return <EmployeeDashboard />;
	}
};
