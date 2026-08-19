import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects } from "../../hooks/useProjects";
import { useCreateWorkLog, useUpdateWorkLog } from "../../hooks/useWorkLogs";
import { useAppStore } from "../../store/useAppStore";
import type { TaskStatus } from "../../types";
import { RichTextEditor } from "./RichTextEditor";
import { LoadingSpinner } from "./LoadingSpinner";

interface DrawerProps {
	onClose: () => void;
	editingLog?: any;
	defaultDate?: string;
	defaultProject?: string;
	isReadOnly?: boolean;
}

export const LogTaskDrawer: React.FC<DrawerProps> = ({
	onClose,
	editingLog,
	defaultDate,
	defaultProject,
	isReadOnly = false,
}) => {
	const queryClient = useQueryClient();
	const { currentUser } = useAppStore();
	const isUserDisabled = currentUser?.status === 'Disabled';
	const { data: projects = [] } = useProjects();
	const createWorkLogMutation = useCreateWorkLog();
	const updateWorkLogMutation = useUpdateWorkLog();
	const [isUpdatingList, setIsUpdatingList] = useState(false);

	const todayStr = new Date().toISOString().slice(0, 10);
	const [project, setProject] = useState(() => {
		const initialId = editingLog?.projectId || defaultProject || "";
		if (initialId === "internal" || initialId === "internal-project") return "internal";
		return initialId;
	});
	const [task, setTask] = useState(editingLog?.taskName || "");
	const [taskDescription, setTaskDescription] = useState(
		editingLog?.taskDescription || editingLog?.description || "",
	);
	const [timeHours, setTimeHours] = useState(() => {
		if (editingLog?.hours !== undefined)
			return String(Math.floor(editingLog.hours));
		return "";
	});
	const [timeMinutes, setTimeMinutes] = useState(() => {
		if (editingLog?.hours !== undefined)
			return String(Math.round((editingLog.hours % 1) * 60));
		return "";
	});
	const [taskStatus, setTaskStatus] = useState<TaskStatus>(
		editingLog?.taskStatus || editingLog?.status || "In Progress",
	);
	const [date, setDate] = useState(() => {
		if (editingLog?.date) return String(editingLog.date).split("T")[0];
		const initial = defaultDate || todayStr;
		return initial > todayStr ? todayStr : initial;
	});
	const [ticketInput, setTicketInput] = useState("");
	const [tickets, setTickets] = useState<string[]>(
		(editingLog?.tickets || []).map((t: any) =>
			typeof t === "string" ? t : t.ticketNumber || "",
		),
	);
	const [error, setError] = useState("");
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const h = parseInt(timeHours || "0", 10);
	const m = parseInt(timeMinutes || "0", 10);
	const totalMins = h * 60 + m;
	const totalDecimalHours = parseFloat((h + m / 60).toFixed(2));

	const fieldErrors = {
		project: !project ? "Please select a project." : undefined,
		task: !task.trim() ? "Task name is required." : undefined,
		time:
			timeHours === "" && timeMinutes === ""
				? "Enter time spent."
				: totalMins < 5
					? "Minimum time is 5 minutes."
					: totalDecimalHours > 24
						? "Cannot exceed 24 hours per entry."
						: undefined,
		date: !date
			? "Date is required."
			: date > todayStr
				? "Cannot enter a future date."
				: undefined,
	};

	const isPending =
		createWorkLogMutation.isPending || updateWorkLogMutation.isPending || isUpdatingList;
	const isSubmitDisabled =
		isUserDisabled ||
		!!fieldErrors.project ||
		!!fieldErrors.task ||
		!!fieldErrors.time ||
		!!fieldErrors.date ||
		isPending;

	const handleBlur = (field: string) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	};

	const addTicket = () => {
		const val = ticketInput.trim();
		if (val && !tickets.includes(val)) setTickets([...tickets, val]);
		setTicketInput("");
	};

	const handleSave = () => {
		if (isSubmitDisabled) {
			setTouched({ project: true, task: true, time: true, date: true });
			return;
		}

		const numHours = totalDecimalHours;
		const refreshQueries = async () => {
			setIsUpdatingList(true);
			try {
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: ['workLogs'] }),
					queryClient.invalidateQueries({ queryKey: ['projects'] }),
					queryClient.invalidateQueries({ queryKey: ['project'] }),
					queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
					queryClient.invalidateQueries({ queryKey: ['reports'] }),
					queryClient.refetchQueries({ queryKey: ['workLogs'] }),
					queryClient.refetchQueries({ queryKey: ['projects'] }),
					queryClient.refetchQueries({ queryKey: ['dashboard'] }),
				]);
			} catch (e) {
				console.error(e);
			} finally {
				setIsUpdatingList(false);
				onClose();
			}
		};

		if (editingLog) {
			updateWorkLogMutation.mutate(
				{
					id: editingLog.id,
					data: {
						projectId: project,
						taskName: task.trim(),
						taskDescription,
						hours: numHours,
						date,
						taskStatus,
					},
				},
				{
					onSuccess: () => {
						refreshQueries();
					},
					onError: (err: unknown) => {
						const msg =
							(err as { response?: { data?: { message?: string } } })?.response
								?.data?.message || "Failed to update work log";
						setError(msg);
					},
				},
			);
		} else {
			createWorkLogMutation.mutate(
				{
					projectId: project,
					taskName: task.trim(),
					taskDescription,
					hours: numHours,
					date,
					status: "Pending",
					taskStatus,
					tickets: tickets.map((t) => ({ ticketNumber: t })),
				},
				{
					onSuccess: () => {
						refreshQueries();
					},
					onError: (err: unknown) => {
						const msg =
							(err as { response?: { data?: { message?: string } } })?.response
								?.data?.message || "Failed to create work log";
						setError(msg);
					},
				},
			);
		}
	};

	const renderFieldError = (message?: string) => {
		if (!message) return null;
		return (
			<div
				style={{
					fontSize: 12,
					color: "#ef4444",
					marginTop: 5,
					display: "flex",
					alignItems: "center",
					gap: 6,
					fontWeight: 500,
				}}
			>
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					style={{ width: 14, height: 14, flexShrink: 0 }}
				>
					<circle cx="8" cy="8" r="6.25" />
					<path
						d="M8 5v3.5M8 11h.01"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<span>{message}</span>
			</div>
		);
	};

	return (
		<div className="drawer-overlay">
			<div className="drawer">
				<div className="drawer__header">
					<span className="drawer__header-title">
						{isReadOnly ? "Task View" : editingLog ? "Edit Task Log" : "Log Task"}
					</span>
					<button className="drawer__header-close" onClick={onClose}>
						<svg
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M3 3l10 10M13 3L3 13" />
						</svg>
					</button>
				</div>
				<div className="drawer__body">
					{isUserDisabled && (
						<div
							style={{
								padding: "12px 16px",
								background: "#fef2f2",
								border: "1px solid #fecaca",
								borderRadius: 8,
								color: "#991b1b",
								fontSize: 13,
								marginBottom: 16,
								fontWeight: 600,
								display: "flex",
								alignItems: "center",
								gap: 10,
							}}
						>
							<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.8">
								<circle cx="8" cy="8" r="6" />
								<path d="M5 5l6 6M11 5l-6 6" />
							</svg>
							Account Disabled: Your account has been marked as disabled. You are unable to log or submit timesheet tasks.
						</div>
					)}
					{error && (
						<p
							style={{
								color: "#ef4444",
								fontSize: 13,
								marginBottom: 12,
								padding: "8px 12px",
								background: "#fef2f2",
								border: "1px solid #f87171",
								borderRadius: 8,
							}}
						>
							{error}
						</p>
					)}

					<div className="form-group">
						<label className="form-group__label">
							Project <span style={{ color: "#ef4444" }}>*</span>
						</label>
						<select
							className="form-group__select"
							value={project}
							onChange={(e) => setProject(e.target.value)}
							onBlur={() => handleBlur("project")}
							style={{
								borderColor:
									touched.project && fieldErrors.project
										? "#ef4444"
										: undefined,
							}}
							disabled={isReadOnly}
						>
							<option value="">Select project…</option>
							<option value="internal">Internal</option>
							{projects
								.filter(
									(p: { id: string; name: string }) =>
										p.id !== "internal" && p.name.toLowerCase() !== "internal",
								)
								.map((p: { id: string; name: string }) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
						</select>
						{touched.project && renderFieldError(fieldErrors.project)}
					</div>

					<div className="form-group">
						<label className="form-group__label">
							Task Name <span style={{ color: "#ef4444" }}>*</span>
						</label>
						<input
							className="form-group__input"
							placeholder="What did you work on?"
							value={task}
							onChange={(e) => setTask(e.target.value)}
							onBlur={() => handleBlur("task")}
							autoFocus={!isReadOnly}
							disabled={isReadOnly}
							style={{
								borderColor:
									touched.task && fieldErrors.task ? "#ef4444" : undefined,
							}}
						/>
						{touched.task && renderFieldError(fieldErrors.task)}
					</div>

					<div className="form-group">
						<label className="form-group__label">Description</label>
						<RichTextEditor
							value={taskDescription}
							onChange={setTaskDescription}
							readOnly={isReadOnly}
							placeholder="Add task details, bullet points, acceptance criteria..."
						/>
					</div>

					<div className="form-group">
						<label className="form-group__label">Linked Tickets</label>
						<div className="ticket-chips">
							{tickets.map((t) => (
								<div className="ticket-chip" key={t}>
									{t}
									{!isReadOnly && (
										<span
											className="ticket-chip__remove"
											onClick={() => setTickets(tickets.filter((x) => x !== t))}
										>
											✕
										</span>
									)}
								</div>
							))}
						</div>
						{!isReadOnly && (
							<>
								<div style={{ display: "flex", gap: 8 }}>
									<input
										className="form-group__input"
										placeholder="JIRA-324, GH-88, or paste URL…"
										value={ticketInput}
										onChange={(e) => setTicketInput(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && addTicket()}
										style={{ flex: 1 }}
									/>
									<button
										type="button"
										className="btn btn--secondary btn--sm"
										onClick={addTicket}
									>
										Add
									</button>
								</div>
								<p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
									Press Enter or click Add. Any URL or ticket ID accepted.
								</p>
							</>
						)}
					</div>

					<div
						style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
					>
						<div className="form-group">
							<label className="form-group__label">
								Time Spent <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 8,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
									<input
										className="form-group__input"
										type="number"
										min="0"
										max="24"
										step="1"
										placeholder="0"
										value={timeHours}
										onChange={(e) => setTimeHours(e.target.value)}
										onBlur={() => handleBlur("time")}
										disabled={isReadOnly}
										style={{
											borderColor:
												touched.time && fieldErrors.time
													? "#ef4444"
													: undefined,
										}}
									/>
									<span style={{ fontSize: 13, color: "#6b7280" }}>h</span>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
									<input
										className="form-group__input"
										type="number"
										min="0"
										max="59"
										step="1"
										placeholder="0"
										value={timeMinutes}
										onChange={(e) => setTimeMinutes(e.target.value)}
										onBlur={() => handleBlur("time")}
										disabled={isReadOnly}
										style={{
											borderColor:
												touched.time && fieldErrors.time
													? "#ef4444"
													: undefined,
										}}
									/>
									<span style={{ fontSize: 13, color: "#6b7280" }}>m</span>
								</div>
							</div>
							{touched.time && renderFieldError(fieldErrors.time)}
						</div>
						<div className="form-group">
							<label className="form-group__label">
								Date <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<input
								className="form-group__input"
								type="date"
								max={todayStr}
								value={date}
								onChange={(e) => setDate(e.target.value)}
								onBlur={() => handleBlur("date")}
								disabled={isReadOnly}
								style={{
									borderColor:
										touched.date && fieldErrors.date ? "#ef4444" : undefined,
								}}
							/>
							{touched.date && renderFieldError(fieldErrors.date)}
						</div>
					</div>

					<div className="form-group">
						<label className="form-group__label">
							Status <span style={{ color: "#ef4444" }}>*</span>
						</label>
						<select
							className="form-group__select"
							value={taskStatus}
							onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
							disabled={isReadOnly}
						>
							{(
								["Not Started", "In Progress", "Completed"] as TaskStatus[]
							).map((s) => (
								<option key={s}>{s}</option>
							))}
						</select>
					</div>
				</div>
				<div className="drawer__footer">
					{isUpdatingList && (
						<div style={{ padding: "6px 12px", background: "#eff6ff", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
							<LoadingSpinner inline size="sm" />
							Updating task list…
						</div>
					)}
					<button
						type="button"
						className={isReadOnly ? "btn btn--primary" : "btn btn--ghost"}
						onClick={onClose}
						disabled={isPending}
					>
						{isReadOnly ? "Close" : "Cancel"}
					</button>
					{!isReadOnly && (
						<button
							type="button"
							className="btn btn--primary"
							onClick={handleSave}
							disabled={isSubmitDisabled}
							style={{
								opacity: isSubmitDisabled ? 0.6 : 1,
								cursor: isSubmitDisabled ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
							}}
						>
							{isPending ? (
								<>
									<LoadingSpinner inline size="sm" />
									{isUpdatingList ? "Updating list…" : "Saving…"}
								</>
							) : editingLog ? (
								"Update Entry"
							) : (
								"Save Entry"
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
