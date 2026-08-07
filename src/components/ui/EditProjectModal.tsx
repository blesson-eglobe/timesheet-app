import React, { useState } from "react";
import ReactDOM from "react-dom";
import Select from "react-select";
import {
	useUpdateProject,
	useDeleteProject,
	useProjects,
} from "../../hooks/useProjects";
import { useEmployees } from "../../hooks/useEmployees";
interface EditProjectModalProps {
	project: {
		id: string;
		name: string;
		description?: string;
		status: string;
		priority?: string;
		totalHours?: number;
		endDate?: string;
		teamMembers?: any[];
	};
	onClose: () => void;
	onDeleted?: () => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
	project,
	onClose,
	onDeleted,
}) => {
	const { data: existingProjects } = useProjects();
	const updateMutation = useUpdateProject();

	const [name, setName] = useState(project.name || "");
	const [description, setDescription] = useState(project.description || "");
	const [status, setStatus] = useState(project.status || "Not Started");
	const [priority, setPriority] = useState(project.priority || "Medium");
	const [type, setType] = useState<'Billable' | 'Internal'>((project as any).type || (project as any).projectType || 'Billable');
	const [estimatedHours, setEstimatedHours] = useState(
		project.totalHours ? String(project.totalHours) : "",
	);
	const [endDate, setEndDate] = useState(project.endDate ? String(project.endDate).split('T')[0] : "");
	const [error, setError] = useState("");
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const { data: employeesData } = useEmployees();
	const allUsers = employeesData || [];
	const availableManagers = allUsers.filter(
		(u: any) => u.role === "manager" || u.role === "admin",
	);
	const availableEmployees = allUsers.filter((u: any) => u.role === "employee");

	const initialManagers = (project.teamMembers || [])
		.filter((m: any) => m.role === "manager" || m.role === "admin")
		.map((m: any) => m.id);
	const initialEmployees = (project.teamMembers || [])
		.filter((m: any) => m.role === "employee")
		.map((m: any) => m.id);

	const [selectedManagers, setSelectedManagers] =
		useState<string[]>(initialManagers);
	const [selectedEmployees, setSelectedEmployees] =
		useState<string[]>(initialEmployees);

	const handleToggleManager = (id: string) => {
		setSelectedManagers((prev) =>
			prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
		);
	};

	const handleToggleEmployee = (id: string) => {
		setSelectedEmployees((prev) =>
			prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
		);
	};

	const isDuplicate = existingProjects?.some(
		(p: { id: string; name: string }) =>
			p.id !== project.id &&
			p.name.trim().toLowerCase() === name.trim().toLowerCase(),
	);

	const fieldErrors = {
		name: !name.trim()
			? "Project Name is required."
			: isDuplicate
				? "A project with this name already exists."
				: undefined,
		type: !type ? "Project Type is required." : undefined,
		managers: selectedManagers.length === 0 ? "Select at least one manager." : undefined,
		employees: selectedEmployees.length === 0 ? "Select at least one employee." : undefined,
	};

	const isSubmitDisabled =
		!!fieldErrors.name ||
		!!fieldErrors.type ||
		!!fieldErrors.managers ||
		!!fieldErrors.employees ||
		updateMutation.isPending;

	const handleBlur = (field: string) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	};

	const handleFocus = (field: string) => {
		setTouched((prev) => ({ ...prev, [field]: false }));
	};

	const handleUpdate = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitDisabled) {
			setTouched({ name: true, type: true, managers: true, employees: true });
			return;
		}

		const numHours = parseFloat(estimatedHours) || 0;
		updateMutation.mutate(
			{
				id: project.id,
				data: {
					name: name.trim(),
					description: description.trim(),
					status,
					priority,
					type,
					projectType: type,
					estimatedHours: numHours,
					endDate: endDate || undefined,
					memberIds: [...selectedManagers, ...selectedEmployees],
				},
			},
			{
				onSuccess: () => {
					onClose();
				},
				onError: (err: unknown) => {
					const msg =
						(err as { response?: { data?: { message?: string } } })?.response
							?.data?.message || "Failed to update project.";
					setError(msg);
				},
			},
		);
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

	return ReactDOM.createPortal(
		<div
			className="modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="modal" style={{ width: 520 }}>
				<div className="modal__header">
					<span className="modal__header-title">Edit Project Details</span>
					<button
						type="button"
						className="modal__header-close"
						onClick={onClose}
					>
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

				<form
					onSubmit={handleUpdate}
					style={{
						display: "flex",
						flexDirection: "column",
						flex: 1,
						overflow: "hidden",
					}}
				>
					<div className="modal__body">
						{error && (
							<div
								style={{
									background: "#fef2f2",
									border: "1px solid #f87171",
									color: "#b91c1c",
									padding: "10px 14px",
									borderRadius: 8,
									fontSize: 13,
									marginBottom: 16,
								}}
							>
								{error}
							</div>
						)}

						<div className="form-group">
							<label className="form-group__label">
								Project Name <span style={{ color: "#ef4444" }}>*</span>
							</label>
							<input
								className="form-group__input"
								placeholder="e.g. Q3 Mobile App Redesign"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onBlur={() => handleBlur("name")}
								onFocus={() => handleFocus("name")}
								autoFocus
								style={{
									borderColor:
										touched.name && fieldErrors.name ? "#ef4444" : undefined,
								}}
							/>
							{touched.name && renderFieldError(fieldErrors.name)}
						</div>

						<div className="form-group">
							<label className="form-group__label">Description</label>
							<textarea
								className="form-group__input"
								placeholder="Brief summary of project goals and scope..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								onBlur={() => handleBlur("description")}
								style={{
									minHeight: 84,
									padding: "12px 14px",
									lineHeight: "1.5",
									resize: "vertical",
								}}
							/>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr 1fr",
								gap: 12,
							}}
						>
							<div className="form-group">
								<label className="form-group__label">
									Project Type <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<select
									className="form-group__select"
									value={type}
									onChange={(e) => setType(e.target.value as 'Billable' | 'Internal')}
								>
									<option value="Billable">Billable</option>
									<option value="Internal">Internal</option>
								</select>
							</div>
							<div className="form-group">
								<label className="form-group__label">
									Status <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<select
									className="form-group__select"
									value={status}
									onChange={(e) => setStatus(e.target.value)}
								>
									<option value="Not Started">Not Started</option>
									<option value="Ongoing">Ongoing</option>
									<option value="Completed">Completed</option>
								</select>
							</div>
							<div className="form-group">
								<label className="form-group__label">
									Priority <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<select
									className="form-group__select"
									value={priority}
									onChange={(e) => setPriority(e.target.value)}
								>
									<option value="Critical">Critical</option>
									<option value="High">High</option>
									<option value="Medium">Medium</option>
									<option value="Low">Low</option>
								</select>
							</div>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 16,
							}}
						>
							<div className="form-group">
								<label className="form-group__label">
									Estimated Budget Hours
								</label>
								<input
									type="number"
									className="form-group__input"
									min="0"
									step="1"
									placeholder="e.g. 100"
									value={estimatedHours}
									onChange={(e) => setEstimatedHours(e.target.value)}
								/>
							</div>
							<div className="form-group">
								<label className="form-group__label">
									Target Due Date
								</label>
								<input
									type="date"
									className="form-group__input"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
							</div>
						</div>

						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 16,
								marginTop: 8,
							}}
						>
							<div className="form-group">
								<label className="form-group__label">
									Managers <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<Select
									isMulti
									menuPortalTarget={document.body}
									options={availableManagers.map((m: any) => ({
										value: m.id,
										label: m.name,
									}))}
									value={availableManagers
										.filter((m: any) => selectedManagers.includes(m.id))
										.map((m: any) => ({ value: m.id, label: m.name }))}
									onChange={(selected: any) => {
										setSelectedManagers(
											selected ? selected.map((o: any) => o.value) : [],
										);
										setTouched((prev) => ({ ...prev, managers: true }));
									}}
									placeholder="Select managers..."
									noOptionsMessage={() => "No managers available"}
									styles={{
										control: (base) => ({
											...base,
											minHeight: 42,
											borderRadius: 8,
											borderColor: touched.managers && fieldErrors.managers ? "#ef4444" : "#e5e7eb",
										}),
										menuPortal: (base) => ({ ...base, zIndex: 9999 }),
									}}
								/>
								{touched.managers && renderFieldError(fieldErrors.managers)}
							</div>

							<div className="form-group">
								<label className="form-group__label">
									Employees <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<Select
									isMulti
									menuPortalTarget={document.body}
									options={availableEmployees.map((e: any) => ({
										value: e.id,
										label: e.name,
									}))}
									value={availableEmployees
										.filter((e: any) => selectedEmployees.includes(e.id))
										.map((e: any) => ({ value: e.id, label: e.name }))}
									onChange={(selected: any) => {
										setSelectedEmployees(
											selected ? selected.map((o: any) => o.value) : [],
										);
										setTouched((prev) => ({ ...prev, employees: true }));
									}}
									placeholder="Select employees..."
									noOptionsMessage={() => "No employees available"}
									styles={{
										control: (base) => ({
											...base,
											minHeight: 42,
											borderRadius: 8,
											borderColor: touched.employees && fieldErrors.employees ? "#ef4444" : "#e5e7eb",
										}),
										menuPortal: (base) => ({ ...base, zIndex: 9999 }),
									}}
								/>
								{touched.employees && renderFieldError(fieldErrors.employees)}
							</div>
						</div>
					</div>

					<div className="modal__footer">
						<button
							type="button"
							className="btn btn--ghost"
							onClick={onClose}
							disabled={updateMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn btn--primary"
							disabled={isSubmitDisabled}
							style={{
								opacity: isSubmitDisabled ? 0.5 : 1,
								cursor: isSubmitDisabled ? "not-allowed" : "pointer",
							}}
						>
							{updateMutation.isPending ? "Saving…" : "Save Changes"}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body,
	);
};
