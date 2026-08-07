import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { AvatarStack } from "../components/ui/Avatar";
import { Pagination } from "../components/ui/Pagination";
import { CreateProjectModal } from "../components/ui/CreateProjectModal";
import { EditProjectModal } from "../components/ui/EditProjectModal";
import { useProjects } from "../hooks/useProjects";
import { useAppStore } from "../store/useAppStore";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export const Projects: React.FC = () => {
	const { role } = useAppStore();
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState("All");
	const [page, setPage] = useState(1);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingProject, setEditingProject] = useState<any | null>(null);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const pageSize = viewMode === "list" ? 10 : 6;

	const { data: projects = [], isLoading } = useProjects({
		search: search || undefined,
		status: filter === "All" ? undefined : filter,
	});

	const paginatedProjects = viewMode === "list"
		? projects.slice((page - 1) * pageSize, page * pageSize)
		: projects;

	const extras: Record<
		string,
		{
			b1: string;
			b1Color: string;
			b2: string;
			b2Color: string;
			client: string;
			color: string;
		}
	> = {
		p1: {
			b1: "Active",
			b1Color: "green",
			b2: "High",
			b2Color: "orange",
			client: "Internal",
			color: "blue",
		},
		p2: {
			b1: "In Review",
			b1Color: "yellow",
			b2: "Medium",
			b2Color: "blue",
			client: "RetailMax",
			color: "green",
		},
		p3: {
			b1: "Active",
			b1Color: "green",
			b2: "High",
			b2Color: "orange",
			client: "FinTech Corp",
			color: "purple",
		},
		p4: {
			b1: "Planning",
			b1Color: "blue",
			b2: "Medium",
			b2Color: "blue",
			client: "Internal",
			color: "orange",
		},
		p5: {
			b1: "Active",
			b1Color: "green",
			b2: "Critical",
			b2Color: "red",
			client: "Internal",
			color: "red",
		},
	};

	const hexMap: Record<string, string> = {
		blue: "#3b82f6",
		green: "#22c55e",
		purple: "#9333ea",
		orange: "#f97316",
		red: "#ef4444",
	};

	if (isLoading && projects.length === 0 && !search) {
		return (
			<div className="page-inner">
				<LoadingSpinner message="Loading projects…" fullPage />
			</div>
		);
	}

	return (
		<div className="page-inner">
			<div className="page-header">
				<div className="page-header__row">
					<div>
						<div className="page-header__title">Projects</div>
					</div>
					{role === "manager" && (
						<button
							type="button"
							className="btn btn--primary"
							onClick={() => setShowCreateModal(true)}
						>
							+ New Project
						</button>
					)}
				</div>
			</div>

			<div className="projects__toolbar">
				<div className="projects__toolbar-left">
					<div className="projects__search">
						<svg
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<circle cx="6.5" cy="6.5" r="4.5" />
							<path d="M10.5 10.5L14 14" />
						</svg>
						<input
							placeholder="Search projects..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
						/>
					</div>
					<div className="projects__tabs">
						{["All", "Not Started", "Ongoing", "Completed"].map((f) => (
							<button
								type="button"
								key={f}
								className={`projects__tab${filter === f ? " projects__tab--active" : ""}`}
								onClick={() => {
									setFilter(f);
									setPage(1);
								}}
							>
								{f}
							</button>
						))}
					</div>
				</div>
				<div className="projects__toolbar-right">
					<div className="worklogs__view-toggle">
						<button
							type="button"
							className={`worklogs__view-btn${viewMode === "grid" ? " worklogs__view-btn--active" : ""}`}
							onClick={() => setViewMode("grid")}
						>
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								style={{ width: 14, height: 14 }}
							>
								<rect x="1.5" y="1.5" width="5" height="5" rx="1" />
								<rect x="9.5" y="1.5" width="5" height="5" rx="1" />
								<rect x="1.5" y="9.5" width="5" height="5" rx="1" />
								<rect x="9.5" y="9.5" width="5" height="5" rx="1" />
							</svg>
						</button>
						<button
							type="button"
							className={`worklogs__view-btn${viewMode === "list" ? " worklogs__view-btn--active" : ""}`}
							onClick={() => setViewMode("list")}
						>
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								style={{ width: 14, height: 14 }}
							>
								<path d="M1.5 4h13M1.5 8h13M1.5 12h13" />
							</svg>
						</button>
					</div>
				</div>
			</div>

			{viewMode === "grid" ? (
				<div className="projects__grid">
					{paginatedProjects.map(
						(p: {
							id: string;
							name: string;
							status: string;
							priority: string;
							description: string;
							progress: number;
							loggedHours: number;
							totalHours: number;
							teamMembers?: { initials: string; color: string; name: string }[];
							managers?: {
								initials?: string;
								color?: string;
								name: string;
								role?: string;
							}[];
						}) => {
							const badgeVariant =
								p.status === "Completed"
									? "green"
									: p.status === "Ongoing" || p.status === "On Track"
										? "blue"
										: "gray";
							const ex = extras[p.id];
							const dotHex = hexMap[ex?.color || "blue"] || "#3b82f6";
							const barColor =
								p.status === "Over Budget"
									? "red"
									: p.status === "At Risk"
										? "orange"
										: "green";

							return (
								<div
									key={p.id}
									className="projects__card"
									onClick={() => navigate(`/projects/${p.id}`)}
									style={{ cursor: "pointer" }}
								>
									<div className="projects__card-header">
										<div
											style={{ display: "flex", alignItems: "center", gap: 8 }}
										>
											<div
												style={{
													width: 8,
													height: 8,
													borderRadius: "50%",
													backgroundColor: dotHex,
												}}
											/>
											<span className="projects__card-title">{p.name}</span>
										</div>
										<div
											style={{ display: "flex", alignItems: "center", gap: 8 }}
										>
											<Badge variant={badgeVariant as any} dot>
												{p.status}
											</Badge>
											{role === "manager" && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setEditingProject(p);
													}}
													title="Edit project details"
													style={{
														display: "inline-flex",
														alignItems: "center",
														justifyContent: "center",
														width: 30,
														height: 30,
														padding: 0,
														color: "#3b82f6",
														background: "#ffffff",
														border: "1px solid #e2e8f0",
														borderRadius: 6,
														cursor: "pointer",
													}}
												>
													<svg
														width="14"
														height="14"
														viewBox="0 0 16 16"
														fill="none"
														stroke="currentColor"
														strokeWidth="1.6"
													>
														<path d="M11 2a2 2 0 0 1 2 2l-8 8-4 1 1-4 8-8z" />
													</svg>
												</button>
											)}
										</div>
									</div>
									<div className="projects__card-desc">
										{p.description || "No description provided."}
									</div>

									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											padding: "8px 12px",
											background: "#f8fafc",
											border: "1px solid #e2e8f0",
											borderRadius: 8,
											fontSize: 12,
											margin: "12px 0 8px 0",
										}}
									>
										<svg
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="#d97706"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											style={{ flexShrink: 0 }}
										>
											<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
										</svg>
										<div>
											<span style={{ fontWeight: 600, color: "#0f172a" }}>
												Project Manager:{" "}
											</span>
											<span style={{ color: "#334155", fontWeight: 500 }}>
												{p.managers && p.managers.length > 0
													? p.managers.map((m: any) => m.name).join(", ")
													: p.name.toLowerCase() === "internal"
														? "Internal Lead"
														: "Rahul (Engineering Lead)"}
											</span>
										</div>
									</div>

									<div className="projects__card-progress">
										<div className="projects__card-progress-header">
											<span className="projects__card-progress-label">
												Progress
											</span>
											<span className="projects__card-progress-pct">
												{p.progress}%
											</span>
										</div>
										<ProgressBar
											value={p.progress}
											color={barColor as any}
											thickness="thick"
										/>
									</div>

									<div className="projects__card-meta">
										<AvatarStack
											members={(p.teamMembers || []).filter(
												(m: any) => m.role !== "manager" && m.role !== "admin",
											)}
											max={4}
										/>
										<div>
											<div className="projects__card-meta-hours">
												{p.loggedHours}h / {p.totalHours}h
											</div>
											<div className="projects__card-meta-days">
												{Math.max(
													0,
													Math.floor((p.totalHours - p.loggedHours) / 8),
												)}
												d left
											</div>
										</div>
									</div>

									<div className="projects__card-footer">
										<div className="projects__card-footer-badges">
											<Badge
												variant={
													p.status === "Completed" ? "green" : ("blue" as any)
												}
											>
												{p.status}
											</Badge>
											<Badge
												variant={
													p.priority === "High" || p.priority === "Critical"
														? "red"
														: ("blue" as any)
												}
											>
												{p.priority || "Medium"}
											</Badge>
										</div>
										<span className="projects__card-footer-client">
											{ex?.client ||
												(p.name.toLowerCase() === "internal"
													? "Internal"
													: "eGlobe Client")}
										</span>
									</div>
								</div>
							);
						},
					)}
					{projects.length === 0 && (
						<div
							style={{
								gridColumn: "1 / -1",
								padding: 40,
								textAlign: "center",
								color: "#6b7280",
								background: "#fff",
								borderRadius: 12,
								border: "1px solid #e5e7eb",
							}}
						>
							No projects found matching your filters.
						</div>
					)}
				</div>
			) : (
				<div className="data-table--card">
					<table className="data-table">
						<thead>
							<tr>
								<th>Project</th>
								<th>Status</th>
								<th>Priority</th>
								<th>Project Manager</th>
								<th style={{ width: 180 }}>Progress</th>
								<th>Hours</th>
								<th>Team</th>
								{role === "manager" && (
									<th style={{ textAlign: "right" }}>Actions</th>
								)}
							</tr>
						</thead>
						<tbody>
							{paginatedProjects.map(
								(p: {
									id: string;
									name: string;
									status: string;
									priority: string;
									description: string;
									progress: number;
									loggedHours: number;
									totalHours: number;
									teamMembers?: {
										initials: string;
										color: string;
										name: string;
									}[];
									managers?: {
										initials?: string;
										color?: string;
										name: string;
										role?: string;
									}[];
								}) => {
									const badgeVariant =
										p.status === "On Track"
											? "green"
											: p.status === "At Risk"
												? "orange"
												: p.status === "Over Budget"
													? "red"
													: "gray";
									const ex = extras[p.id];
									const dotHex = hexMap[ex?.color || "blue"] || "#3b82f6";
									const barColor =
										p.status === "Over Budget"
											? "red"
											: p.status === "At Risk"
												? "orange"
												: "green";

									return (
										<tr
											key={p.id}
											onClick={() => navigate(`/projects/${p.id}`)}
											style={{ cursor: "pointer" }}
										>
											<td>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: 10,
													}}
												>
													<div
														style={{
															width: 10,
															height: 10,
															borderRadius: "50%",
															backgroundColor: dotHex,
														}}
														className="projects__table-dot"
													/>
													<div>
														<div className="projects__table-proj-name">
															{p.name}
														</div>
													</div>
												</div>
											</td>
											<td>
												<Badge variant={badgeVariant as any} dot>
													{p.status}
												</Badge>
											</td>
											<td>
												<Badge
													variant={
														p.priority === "High" || p.priority === "Critical"
															? "red"
															: ("blue" as any)
													}
												>
													{p.priority || "Medium"}
												</Badge>
											</td>
											<td>
												<div className="projects__table-lead-row">
													<svg
														width="14"
														height="14"
														viewBox="0 0 24 24"
														fill="none"
														stroke="#d97706"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
													</svg>
													<span>
														{p.managers && p.managers.length > 0
															? p.managers.map((m: any) => m.name).join(", ")
															: p.name.toLowerCase() === "internal"
																? "Internal Lead"
																: "Rahul (Engineering Lead)"}
													</span>
												</div>
											</td>
											<td>
												<div className="projects__table-progress-col">
													<div className="projects__table-progress-label">
														<span>{p.progress}%</span>
													</div>
													<ProgressBar
														value={p.progress}
														color={barColor as any}
														thickness="thick"
													/>
												</div>
											</td>
											<td>
												<span className="projects__table-hours-val">
													{p.loggedHours}h
												</span>
												<span className="projects__table-hours-total">
													{" "}
													/ {p.totalHours}h
												</span>
											</td>
											<td>
												<AvatarStack
													members={(p.teamMembers || []).filter(
														(m: any) =>
															m.role !== "manager" && m.role !== "admin",
													)}
													max={4}
												/>
											</td>
											{role === "manager" && (
												<td
													className="projects__table-action-cell"
													onClick={(e) => e.stopPropagation()}
												>
													<button
														type="button"
														onClick={() => setEditingProject(p)}
														title="Edit project details"
														className="projects__table-edit-btn"
													>
														<svg
															width="14"
															height="14"
															viewBox="0 0 16 16"
															fill="none"
															stroke="currentColor"
															strokeWidth="1.6"
														>
															<path d="M11 2a2 2 0 0 1 2 2l-8 8-4 1 1-4 8-8z" />
														</svg>
													</button>
												</td>
											)}
										</tr>
									);
								},
							)}
							{projects.length === 0 && (
								<tr>
									<td
										colSpan={role === "manager" ? 8 : 7}
										className="projects__table-empty"
									>
										No projects found matching your filters.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}
			{viewMode === "list" && (
				<div className="projects__pagination-wrapper">
					<Pagination
						currentPage={page}
						totalItems={projects.length}
						pageSize={pageSize}
						onPageChange={setPage}
					/>
				</div>
			)}
			{showCreateModal && (
				<CreateProjectModal onClose={() => setShowCreateModal(false)} />
			)}
			{editingProject && (
				<EditProjectModal
					project={editingProject}
					onClose={() => setEditingProject(null)}
				/>
			)}
		</div>
	);
};
