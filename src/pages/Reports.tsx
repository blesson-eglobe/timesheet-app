import React, { useState } from "react";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useReports } from "../hooks/useReports";
import { useEmployees } from "../hooks/useEmployees";
import { useProjects } from "../hooks/useProjects";
import { useAppStore } from "../store/useAppStore";
import { AccessRestricted } from "../components/ui/AccessRestricted";
import { USERS, PROJECTS } from "../data/dummy";
import {
	LineChart,
	BarChart,
	GroupedBarChart,
	UtilBars,
} from "../components/ui/Charts";
import { reportsApi, type DetailedEntry } from "../api/reports";

type ReportTab = "hours" | "utilization" | "projects" | "export";
type ExportScope =
	| "self"
	| "employee_all"
	| "employee_single"
	| "project_all"
	| "project_single"
	| "matrix";

const DocIcon = () => (
	<svg
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		width="18"
		height="18"
	>
		<path d="M3.5 2A1.5 1.5 0 015 0.5h4l4 4V14A1.5 1.5 0 0111.5 15.5h-7A1.5 1.5 0 013 14V2z" />
		<path d="M9 0.5V5h4.5" />
	</svg>
);

const healthBadge = (h: string) => {
	if (h === "On Track")
		return { bg: "#dcfce7", color: "#16a34a", border: "#22c55e" };
	if (h === "At Risk")
		return { bg: "#ffedd5", color: "#ea580c", border: "#f97316" };
	if (h === "Over Budget")
		return { bg: "#fee2e2", color: "#dc2626", border: "#ef4444" };
	return { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" };
};

export const Reports: React.FC = () => {
	const { role, currentUser } = useAppStore();

	const [tab, setTab] = useState<ReportTab>("hours");
	const [empPage, setEmpPage] = useState(1);
	const [projPage, setProjPage] = useState(1);
	const defaultFrom = new Date(Date.now() - 30 * 86400000)
		.toISOString()
		.split("T")[0];
	const [exportFrom, setExportFrom] = useState(defaultFrom);
	const [exportTo, setExportTo] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [exportScope, setExportScope] = useState<ExportScope>("self");
	const [selectedEmp, setSelectedEmp] = useState<string>("");
	const [selectedProj, setSelectedProj] = useState<string>("");

	// Preview state
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewPage, setPreviewPage] = useState<1 | 2>(1);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewDetailed, setPreviewDetailed] = useState<DetailedEntry[]>([]);

	const pageSize = 10;
	const [modalConfig, setModalConfig] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		type: "alert" | "confirm";
		onConfirm: () => void;
	} | null>(null);

	const { data: reportsData, isLoading } = useReports();
	const { data: rawEmployees = [] } = useEmployees();
	const { data: rawProjects = [] } = useProjects();

	const employeesList = rawEmployees.length > 0 ? rawEmployees : USERS;
	const projectsList = rawProjects.length > 0 ? rawProjects : PROJECTS;

	const monthlyHoursRaw = (reportsData?.monthlyHours || []) as {
		month: string;
		hours: number;
	}[];
	const deptUtilizationRaw = (reportsData?.deptUtilization || []) as {
		dept: string;
		utilization: number;
	}[];

	const employeeReport =
		reportsData?.employeeReport && reportsData.employeeReport.length > 0
			? reportsData.employeeReport
			: USERS.map((u) => ({
					name: u.name,
					initials: u.initials,
					color: u.color,
					department: u.department,
					designation: u.designation,
					totalHours: 40,
					projects: 2,
					utilization: 85,
				}));

	const projectReport =
		reportsData?.projectReport && reportsData.projectReport.length > 0
			? reportsData.projectReport
			: PROJECTS.map((p) => ({
					id: p.id,
					name: p.name,
					status: p.status,
					budgeted: p.totalHours,
					logged: p.loggedHours,
					utilizationPct: p.progress,
					teamSize: p.teamMembers.length,
				}));

	const todayStr = new Date().toISOString().split("T")[0];
	// Convert yyyy-mm-dd → dd-mm-yyyy for display/export
	const fmtDate = (iso: string) =>
		iso ? iso.split("-").reverse().join("-") : "";

	// Group detailed entries by employee name
	const groupByEmployee = (entries: DetailedEntry[]) => {
		const map = new Map<string, DetailedEntry[]>();
		for (const e of entries) {
			if (!map.has(e.employeeName)) map.set(e.employeeName, []);
			map.get(e.employeeName)!.push(e);
		}
		return map;
	};

	// ── Download helpers ─────────────────────────────────────────────────────
	const handleDownloadCsv = async () => {
		if (!exportFrom || !exportTo) {
			setModalConfig({
				isOpen: true,
				title: "Missing Dates",
				message: "Select a 'From' and 'To' date first.",
				type: "alert",
				onConfirm: () => setModalConfig(null),
			});
			return;
		}

		const filename =
			exportScope === "self"
				? `self_timesheet_${currentUser.name.replace(/\s+/g, "_")}_${fmtDate(exportFrom)}_to_${fmtDate(exportTo)}.csv`
				: `timesheet_report_${fmtDate(exportFrom)}_to_${fmtDate(exportTo)}.csv`;

		try {
			// ── Section 1: Summary ──────────────────────────────────────────
			let targetRows = employeeReport;
			if (exportScope === "self") {
				targetRows = employeeReport.filter(
					(r) => r.name.toLowerCase() === currentUser.name.toLowerCase(),
				);
				if (targetRows.length === 0)
					targetRows = [{ name: currentUser.name, department: currentUser.department || "Staff", designation: currentUser.designation || "Employee", totalHours: 40, projects: 1, utilization: 85 }];
			} else if (exportScope === "employee_single" && selectedEmp) {
				targetRows = employeeReport.filter(
					(r) => r.name.toLowerCase() === selectedEmp.toLowerCase(),
				);
			}

			const summarySection = [
				`=== SECTION 1: SUMMARY — Period: ${fmtDate(exportFrom)} to ${fmtDate(exportTo)} ===`,
				"Employee Name,Department,Designation,Total Hours,Projects,Utilization",
				...targetRows.map((r) =>
					[
						`"${r.name}"`,
						`"${r.department || "Staff"}"`,
						`"${r.designation || "Employee"}"`,
						`${Math.round((r.totalHours || 0) * 100) / 100}`,
						`${r.projects || 0}`,
						`${r.utilization || 0}%`,
					].join(",")
				),
				"", // blank separator row
				`=== PROJECT SUMMARY ===`,
				"Project,Budgeted Hours,Logged Hours,Remaining,Health",
				...projectReport.map((p) => {
					const used = p.utilizationPct || Math.round(((p.logged || 0) / Math.max(1, p.budgeted || 1)) * 100);
					const health = p.status || (used > 100 ? "Over Budget" : used > 85 ? "At Risk" : "On Track");
					return [
						`"${p.name}"`,
						`${p.budgeted || 0}`,
						`${p.logged || 0}`,
						`${Math.max(0, (p.budgeted || 0) - (p.logged || 0))}`,
						`"${health}"`,
					].join(",");
				}),
			];

			// ── Section 2: Detailed timesheet ───────────────────────────────
			let detailedEntries: DetailedEntry[] = [];
			try {
				detailedEntries = await reportsApi.getDetailed({
					from: exportFrom,
					to: exportTo,
					scope: exportScope,
					empName: exportScope === "employee_single" ? selectedEmp : undefined,
				});
			} catch { /* use empty if API unreachable */ }

			const detailSection = [
				"",
				`=== SECTION 2: DETAILED TIMESHEET — Period: ${fmtDate(exportFrom)} to ${fmtDate(exportTo)} ===`,
				"Employee,Department,Date,Project,Task,Hours,Status",
				...detailedEntries.map((e) =>
					[
						`"${e.employeeName}"`,
						`"${e.department}"`,
						`"${fmtDate(e.date)}"`,
						`"${e.projectName}"`,
						`"${e.taskName.replace(/"/g, "'")}"`,
						`${e.hours}`,
						`"${e.status}"`,
					].join(",")
				),
			];

			const csv = [...summarySection, ...detailSection].join("\n");
			const link = document.createElement("a");
			link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch {
			setModalConfig({
				isOpen: true,
				title: "Export Failed",
				message: "Could not generate the CSV export. Please try again.",
				type: "alert",
				onConfirm: () => setModalConfig(null),
			});
		}
	};

	const handleDownloadPdf = async () => {
		if (!exportFrom || !exportTo) {
			setModalConfig({
				isOpen: true,
				title: "Missing Dates",
				message: "Select a 'From' and 'To' date first.",
				type: "alert",
				onConfirm: () => setModalConfig(null),
			});
			return;
		}

		let targetEmpReport = employeeReport;
		if (exportScope === "self") {
			targetEmpReport = employeeReport.filter(
				(r) => r.name.toLowerCase() === currentUser.name.toLowerCase(),
			);
			if (targetEmpReport.length === 0) {
				targetEmpReport = [{ name: currentUser.name, department: currentUser.department || "Staff", designation: currentUser.designation || "Employee", totalHours: 40, projects: 1, utilization: 85 }];
			}
		} else if (exportScope === "employee_single" && selectedEmp) {
			targetEmpReport = employeeReport.filter(
				(r) => r.name.toLowerCase() === selectedEmp.toLowerCase(),
			);
		}

		// Fetch detailed entries for page 2
		let detailedEntries: DetailedEntry[] = [];
		try {
			detailedEntries = await reportsApi.getDetailed({
				from: exportFrom,
				to: exportTo,
				scope: exportScope,
				empName: exportScope === "employee_single" ? selectedEmp : undefined,
			});
		} catch { /* fallback to empty */ }

		// ── Build Page 1 HTML ─────────────────────────────────────────────────
		const empRows = targetEmpReport
			.map((r) => {
				const util = r.utilization || 0;
				const utilColor = util >= 85 ? "#16a34a" : util >= 60 ? "#ea580c" : "#dc2626";
				const hoursRounded = Math.round((r.totalHours || 0) * 100) / 100;
				return `<tr>
          <td>${r.name}</td><td>${r.department || "–"}</td><td>${r.designation || "–"}</td>
          <td style="text-align:center">${hoursRounded}h</td>
          <td style="text-align:center">${r.projects}</td>
          <td style="text-align:center;color:${utilColor};font-weight:700">${util}%</td>
        </tr>`;
			})
			.join("");

		const projRows = projectReport
			.map((p) => {
				const used = p.utilizationPct || Math.round(((p.logged || 0) / Math.max(1, p.budgeted || 1)) * 100);
				const health = p.status || (used > 100 ? "Over Budget" : used > 85 ? "At Risk" : "On Track");
				const hc = health === "On Track" ? "#16a34a" : health === "At Risk" ? "#ea580c" : "#dc2626";
				return `<tr>
          <td>${p.name}</td>
          <td style="text-align:center">${p.budgeted || 0}h</td>
          <td style="text-align:center;color:#4f46e5;font-weight:700">${p.logged || 0}h</td>
          <td style="text-align:center">${Math.max(0, (p.budgeted || 0) - (p.logged || 0))}h</td>
          <td style="text-align:center;color:${hc};font-weight:700">${health}</td>
        </tr>`;
			})
			.join("");

		const totalHrs = Math.round(employeeReport.reduce((s, r) => s + (r.totalHours || 0), 0) * 100) / 100;
		const avgUtil = employeeReport.length
			? Math.round(employeeReport.reduce((s, e) => s + (e.utilization || 0), 0) / employeeReport.length)
			: 0;
		const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });

		// ── Build Page 2 HTML: Detailed timesheet ─────────────────────────────
		const grouped = groupByEmployee(detailedEntries);
		const detailSections = Array.from(grouped.entries())
			.map(([empName, entries]) => {
				const empTotal = entries.reduce((s, e) => s + e.hours, 0);
				const rows = entries
					.map(
						(e) =>
							`<tr>
            <td>${fmtDate(e.date)}</td>
            <td>${e.projectName}</td>
            <td style="max-width:260px;word-break:break-word">${e.taskName}</td>
            <td style="text-align:center;font-weight:600">${e.hours}h</td>
            <td style="text-align:center">
              <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${
								e.status === "Approved"
									? "#dcfce7"
									: e.status === "Rejected"
										? "#fee2e2"
										: "#f3f4f6"
							};color:${
								e.status === "Approved"
									? "#16a34a"
									: e.status === "Rejected"
										? "#dc2626"
										: "#6b7280"
							}">${e.status || "Pending"}</span>
            </td>
          </tr>`,
					)
					.join("");
				return `
          <div style="margin-bottom:28px">
            <div style="display:flex;align-items:center;justify-content:space-between;background:#f3f4f6;border-radius:8px;padding:10px 14px;margin-bottom:10px">
              <span style="font-size:13px;font-weight:700;color:#111827">${empName}</span>
              <span style="font-size:12px;font-weight:600;color:#6366f1">Total: ${Math.round(empTotal * 100) / 100}h</span>
            </div>
            <table>
              <thead><tr>
                <th>Date</th><th>Project</th><th>Task</th>
                <th style="text-align:center">Hours</th>
                <th style="text-align:center">Status</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
			})
			.join("");

		const sharedStyles = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; font-size: 13px; padding: 32px 40px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .logo { font-size: 20px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
        .logo span { color: #111827; }
        .meta { font-size: 11px; color: #6b7280; text-align: right; line-height: 1.6; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
        .summary-card .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 6px; }
        .summary-card .value { font-size: 22px; font-weight: 800; color: #111827; }
        .section-title { font-size: 14px; font-weight: 700; color: #111827; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        th { background: #f3f4f6; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 9px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        td { padding: 10px 12px; border-bottom: 1px solid #f9fafb; color: #374151; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
        .page-break { page-break-before: always; padding-top: 32px; }
        @media print { body { padding: 20px; } @page { margin: 1cm; size: A4; } }`;

		const html = `<!DOCTYPE html><html lang="en"><head>
      <meta charset="UTF-8" />
      <title>Timesheet Report — ${fmtDate(exportFrom)} to ${fmtDate(exportTo)}</title>
      <style>${sharedStyles}</style>
    </head><body>

      <!-- PAGE 1: SUMMARY -->
      <div class="header">
        <div><div class="logo">eGlobe<span>ITS</span></div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">Timesheet Summary Report</div></div>
        <div class="meta"><div>Generated: ${generatedAt}</div>
          <div style="font-size:13px;font-weight:600;color:#4b5563;margin-top:2px">Period: ${fmtDate(exportFrom)} — ${fmtDate(exportTo)}</div></div>
      </div>
      <div class="summary">
        <div class="summary-card"><div class="label">Total Hours</div><div class="value">${totalHrs}h</div></div>
        <div class="summary-card"><div class="label">Employees</div><div class="value">${employeeReport.length}</div></div>
        <div class="summary-card"><div class="label">Avg Utilization</div><div class="value">${avgUtil}%</div></div>
        <div class="summary-card"><div class="label">Active Projects</div><div class="value">${projectReport.length}</div></div>
      </div>
      <div class="section-title">Employee Hours Summary</div>
      <table>
        <thead><tr><th>Employee</th><th>Department</th><th>Designation</th>
          <th style="text-align:center">Total Hours</th><th style="text-align:center">Projects</th>
          <th style="text-align:center">Utilization</th></tr></thead>
        <tbody>${empRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px">No employee data</td></tr>'}</tbody>
      </table>
      <div class="section-title">Project Profitability</div>
      <table>
        <thead><tr><th>Project</th><th style="text-align:center">Budgeted</th>
          <th style="text-align:center">Logged</th><th style="text-align:center">Remaining</th>
          <th style="text-align:center">Health</th></tr></thead>
        <tbody>${projRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px">No project data</td></tr>'}</tbody>
      </table>
      <div class="footer">
        <span>eGlobe ITS — Timesheet Management Platform</span>
        <span>Page 1 of 2</span>
      </div>

      <!-- PAGE 2: DETAILED TIMESHEET -->
      <div class="page-break">
        <div class="header">
          <div><div class="logo">eGlobe<span>ITS</span></div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Detailed Timesheet Report</div></div>
          <div class="meta"><div>Generated: ${generatedAt}</div>
            <div style="font-size:13px;font-weight:600;color:#4b5563;margin-top:2px">Period: ${fmtDate(exportFrom)} — ${fmtDate(exportTo)}</div></div>
        </div>
        <div class="section-title" style="margin-top:0">Per-Employee Daily Timesheet</div>
        ${detailSections || '<p style="color:#9ca3af;text-align:center;padding:40px 0">No detailed timesheet data for this period.</p>'}
        <div class="footer">
          <span>eGlobe ITS — Timesheet Management Platform</span>
          <span>Page 2 of 2</span>
        </div>
      </div>

    </body></html>`;

		const w = window.open("", "_blank", "width=900,height=700");
		if (!w) {
			setModalConfig({
				isOpen: true,
				title: "Popup Blocked",
				message: "Allow popups for this site to download PDF reports.",
				type: "alert",
				onConfirm: () => setModalConfig(null),
			});
			return;
		}
		w.document.write(html);
		w.document.close();
		w.onload = () => { w.focus(); w.print(); };
		setTimeout(() => { try { w.focus(); w.print(); } catch { /* already triggered */ } }, 600);
	};

	const handlePreview = async () => {
		if (!exportFrom || !exportTo) {
			setModalConfig({
				isOpen: true,
				title: "Missing Dates",
				message: "Select a 'From' and 'To' date first.",
				type: "alert",
				onConfirm: () => setModalConfig(null),
			});
			return;
		}
		setPreviewPage(1);
		setPreviewOpen(true);
		setPreviewLoading(true);
		try {
			const data = await reportsApi.getDetailed({
				from: exportFrom,
				to: exportTo,
				scope: exportScope,
				empName: exportScope === "employee_single" ? selectedEmp : undefined,
			});
			setPreviewDetailed(data);
		} catch {
			setPreviewDetailed([]);
		} finally {
			setPreviewLoading(false);
		}
	};

	const tabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
		{
			key: "hours",
			label: "Hours Trend",
			icon: (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					width="14"
					height="14"
				>
					<path d="M1 12 L5 7 L9 9 L14 3" />
				</svg>
			),
		},
		{
			key: "utilization",
			label: "Utilization",
			icon: (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					width="14"
					height="14"
				>
					<path d="M4 14V8m4 6V2m4 12V5" />
				</svg>
			),
		},
		{
			key: "projects",
			label: "Projects",
			icon: (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					width="14"
					height="14"
				>
					<path d="M1.5 4.5A1.5 1.5 0 013 3h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 6v6A1.5 1.5 0 0113 13.5H3A1.5 1.5 0 011.5 12V4.5z" />
				</svg>
			),
		},
		{
			key: "export",
			label: "Export Center",
			icon: (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					width="14"
					height="14"
				>
					<path d="M8 2v8M4 8l4 4 4-4" />
					<path d="M2 14h12" />
				</svg>
			),
		},
	];

	// ── Metrics — derive from the SAME array as the table it sits above ──────
	// Hours tab: totalHours sums from employeeReport (= "This Month" column)
	const rawTotalHoursMTD = employeeReport.reduce(
		(s, r) => s + (r.totalHours || 0),
		0,
	);
	const totalHoursMTD = Math.round(rawTotalHoursMTD * 100) / 100;
	const avgDailyPerEmp = employeeReport.length
		? (totalHoursMTD / Math.max(1, employeeReport.length * 20)).toFixed(1)
		: "0.0";

	// Utilization tab: from employeeReport (= "Individual Utilization" rows)
	const avgUtil = employeeReport.length
		? Math.round(
				employeeReport.reduce((s, e) => s + (e.utilization || 0), 0) /
					employeeReport.length,
			)
		: 0;
	const overUtil = employeeReport.filter(
		(e) => (e.utilization || 0) >= 90,
	).length;
	const underUtil = employeeReport.filter(
		(e) => (e.utilization || 0) < 60,
	).length;

	// ── Chart data — same source as paired table / list ──────────────────────
	const monthlyHoursData = monthlyHoursRaw.map((d) => ({
		label: d.month,
		value: d.hours,
	}));
	const deptBarData = deptUtilizationRaw.map((d) => ({
		label: d.dept,
		value: d.utilization,
	}));

	// Utilization rate trend: per-month rate normalised by headcount
	const utilTrendData = monthlyHoursRaw.map((d) => ({
		label: d.month,
		value: Math.min(
			100,
			Math.round((d.hours / Math.max(1, employeeReport.length * 160)) * 100),
		),
	}));

	// Individual util rows — full name, same order as table
	const utilRows = employeeReport.map((r) => ({
		name: r.name,
		dept: r.department,
		initials: r.initials,
		color: r.color,
		pct: r.utilization || 0,
	}));

	// Grouped bar — same projects as Project Profitability table
	const groupedProjData = projectReport.map((p) => ({
		label: p.name,
		a: p.budgeted || 0,
		b: p.logged || 0,
	}));

	const paginatedEmp = employeeReport.slice(
		(empPage - 1) * pageSize,
		empPage * pageSize,
	);
	const paginatedProj = projectReport.slice(
		(projPage - 1) * pageSize,
		projPage * pageSize,
	);

	if (isLoading) {
		return (
			<div className="page-inner">
				<LoadingSpinner message="Loading analytics & reports…" fullPage />
			</div>
		);
	}

	return (
		<div className="page-inner">
			<div className="page-header">
				<div className="page-header__row">
					<div>
						<div className="page-header__title">Reports</div>
						<div className="reports__subtitle reports__header-subtitle">
							Analytics ·{" "}
							{new Date().toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="reports__tabs">
				{tabs.map((t) => (
					<button
						key={t.key}
						className={`reports__tab${tab === t.key ? " reports__tab--active" : ""}`}
						onClick={() => setTab(t.key)}
					>
						{t.icon}
						{t.label}
					</button>
				))}
			</div>

			{/* ── HOURS TREND ── */}
			{tab === "hours" && (
				<>
					<div className="reports__metrics">
						<div className="reports__metric-card">
							<div className="reports__metric-card-top">
								<span className="reports__metric-card-label">
									TOTAL HOURS (MTD)
								</span>
								<svg
									width="15"
									height="15"
									viewBox="0 0 16 16"
									fill="none"
									stroke="#9ca3af"
									strokeWidth="1.5"
								>
									<circle cx="8" cy="8" r="6.5" />
									<path d="M8 7.5v3M8 5.5h.01" />
								</svg>
							</div>
							<div className="reports__metric-card-value">
								{isLoading ? "–" : `${totalHoursMTD}h`}
							</div>
							<div className="reports__metric-card-trend reports__metric-card-trend--up">
								↑ Tracked this period
							</div>
						</div>
						<div className="reports__metric-card">
							<div className="reports__metric-card-top">
								<span className="reports__metric-card-label">
									AVG DAILY PER EMPLOYEE
								</span>
								<svg
									width="15"
									height="15"
									viewBox="0 0 16 16"
									fill="none"
									stroke="#9ca3af"
									strokeWidth="1.5"
								>
									<circle cx="8" cy="8" r="6.5" />
									<path d="M8 7.5v3M8 5.5h.01" />
								</svg>
							</div>
							<div className="reports__metric-card-value">
								{isLoading ? "–" : `${avgDailyPerEmp}h`}
							</div>
							<div className="reports__metric-card-trend reports__metric-card-trend--neutral">
								→ Per person / day
							</div>
						</div>
						<div className="reports__metric-card">
							<div className="reports__metric-card-top">
								<span className="reports__metric-card-label">
									ACTIVE EMPLOYEES
								</span>
								<svg
									width="15"
									height="15"
									viewBox="0 0 16 16"
									fill="none"
									stroke="#9ca3af"
									strokeWidth="1.5"
								>
									<circle cx="8" cy="8" r="6.5" />
									<path d="M8 7.5v3M8 5.5h.01" />
								</svg>
							</div>
							<div className="reports__metric-card-value">
								{isLoading ? "–" : employeeReport.length}
							</div>
							<div className="reports__metric-card-trend reports__metric-card-trend--neutral">
								→ Logged hours
							</div>
						</div>
					</div>

					<div className="reports__chart-card">
						<div className="reports__chart-header">
							<span className="reports__chart-title">Monthly Hours Trend</span>
							<span className="reports__date-hint">Last 6 months</span>
						</div>
						{isLoading ? (
							<div className="reports__empty-center">Loading…</div>
						) : (
							<LineChart
								data={monthlyHoursData}
								height={150}
								color="#1e293b"
								gradientId="hoursGrad"
								yLabel="h"
								emptyMsg="No hours logged yet"
							/>
						)}
					</div>

					<div className="reports__table-card">
						<div className="reports__table-header">
							<span className="reports__table-title">
								Employee Hours Summary
							</span>
						</div>
						<table className="reports__table">
							<thead>
								<tr>
									<th>EMPLOYEE</th>
									<th>DEPT</th>
									<th>THIS MONTH</th>
									<th>BILLABLE</th>
									<th>NON-BILLABLE</th>
									<th>UTILIZATION</th>
								</tr>
							</thead>
							<tbody>
								{paginatedEmp.map(
									(
										row: {
											name: string;
											initials: string;
											color: string;
											department: string;
											totalHours: number;
											utilization: number;
										},
										i: number,
									) => (
										<tr key={i}>
											<td>
												<div className="reports__table-employee">
													<div
														className="reports__table-avatar"
														style={{ background: row.color || "#6366f1" }}
													>
														{row.initials || "U"}
													</div>
													<span className="reports__table-name">
														{row.name}
													</span>
												</div>
											</td>
											<td className="reports__table-sec-cell reports__table-font-sm">
												{row.department || "–"}
											</td>
											<td className="reports__table-hours-cell">
												{Math.round((row.totalHours || 0) * 100) / 100}h
											</td>
											<td className="reports__table-over-cell">
												{Math.round((row.totalHours || 0) * 0.8 * 100) / 100}h
											</td>
											<td className="reports__table-sec-cell">
												{Math.round((row.totalHours || 0) * 0.2 * 100) / 100}h
											</td>
											<td>
												<div className="reports__date-control-row">
													<div className="reports__util-bar-track">
														<div
															className="reports__util-bar-fill"
															style={{
																width: `${Math.min(100, row.utilization)}%`,
																background:
																	row.utilization >= 85
																		? "#22c55e"
																		: row.utilization >= 60
																			? "#f97316"
																			: "#ef4444",
															}}
														/>
													</div>
													<span className="reports__util-pct">
														{row.utilization}%
													</span>
												</div>
											</td>
										</tr>
									),
								)}
								{employeeReport.length === 0 && (
									<tr>
										<td colSpan={6} className="reports__empty-center">
											No employee work hours recorded yet.
										</td>
									</tr>
								)}
							</tbody>
						</table>
						<Pagination
							currentPage={empPage}
							totalItems={employeeReport.length}
							pageSize={pageSize}
							onPageChange={setEmpPage}
						/>
					</div>
				</>
			)}

			{/* ── UTILIZATION ── */}
			{tab === "utilization" && (
				<>
					<div className="reports__metrics">
						<div className="reports__metric-card">
							<div className="reports__metric-card-top">
								<span className="reports__metric-card-label">
									AVG UTILIZATION
								</span>
								<svg
									width="15"
									height="15"
									viewBox="0 0 16 16"
									fill="none"
									stroke="#9ca3af"
									strokeWidth="1.5"
								>
									<path d="M4 14V8m4 6V2m4 12V5" />
								</svg>
							</div>
							<div className="reports__metric-card-value">
								{isLoading ? "–" : `${avgUtil}%`}
							</div>
							<div
								className={`reports__metric-card-trend reports__metric-card-trend--${avgUtil >= 80 ? "up" : "down"}`}
							>
								{avgUtil >= 80 ? "↑" : "↓"} Across departments
							</div>
						</div>
						<div className="reports__metric-card">
							<div className="reports__metric-card-top">
								<span className="reports__metric-card-label">
									OVER-UTILIZED
								</span>
								<svg
									width="15"
									height="15"
									viewBox="0 0 16 16"
									fill="none"
									stroke="#9ca3af"
									strokeWidth="1.5"
								>
									<circle cx="8" cy="8" r="6.5" />
									<path d="M8 7.5v3M8 5.5h.01" />
								</svg>
							</div>
							<div className="reports__metric-card-value">
								{isLoading ? "–" : overUtil}
							</div>
							<div className="reports__metric-card-trend reports__metric-card-trend--neutral">
								— Employees above 90%
							</div>
						</div>
						<div className="reports__metric-card">
							<div className="reports__metric-card-top">
								<span className="reports__metric-card-label">
									UNDER-UTILIZED
								</span>
								<svg
									width="15"
									height="15"
									viewBox="0 0 16 16"
									fill="none"
									stroke="#9ca3af"
									strokeWidth="1.5"
								>
									<path d="M4 6l4 4 4-4" />
								</svg>
							</div>
							<div className="reports__metric-card-value">
								{isLoading ? "–" : underUtil}
							</div>
							<div className="reports__metric-card-trend reports__metric-card-trend--neutral">
								— Employees below 60%
							</div>
						</div>
					</div>

					<div className="reports__util-charts">
						<div className="reports__chart-card" style={{ flex: 1 }}>
							<div className="reports__chart-header">
								<span className="reports__chart-title">
									Department Utilization
								</span>
							</div>
							{isLoading ? (
								<div
									style={{
										height: 160,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "#94a3b8",
									}}
								>
									Loading…
								</div>
							) : (
								<BarChart
									data={deptBarData}
									height={160}
									showPercent
									maxValue={100}
									emptyMsg="No department data"
								/>
							)}
						</div>
					</div>

					<div className="reports__table-card">
						<div className="reports__table-header">
							<span className="reports__table-title">
								Individual Utilization
							</span>
						</div>
						<div style={{ padding: "8px 0" }}>
							{isLoading ? (
								<div
									style={{ padding: 24, color: "#94a3b8", textAlign: "center" }}
								>
									Loading…
								</div>
							) : (
								<UtilBars
									data={utilRows.slice(
										(empPage - 1) * pageSize,
										empPage * pageSize,
									)}
									emptyMsg="No utilization records found."
								/>
							)}
						</div>
						<Pagination
							currentPage={empPage}
							totalItems={employeeReport.length}
							pageSize={pageSize}
							onPageChange={setEmpPage}
						/>
					</div>
				</>
			)}

			{/* ── PROJECTS ── */}
			{tab === "projects" && (
				<>
					<div className="reports__chart-card">
						<div className="reports__chart-header">
							<span className="reports__chart-title">
								Budget vs Logged Hours
							</span>
							<div className="reports__flex-gap-md">
								<span className="reports__date-control-row reports__date-hint">
									<span
										className="worklogs__grid-dropdown-dot"
										style={{ background: "#cbd5e1" }}
									/>
									Budgeted
								</span>
								<span className="reports__date-control-row reports__date-hint">
									<span
										className="worklogs__grid-dropdown-dot"
										style={{ background: "#1e293b" }}
									/>
									Logged
								</span>
							</div>
						</div>
						{isLoading ? (
							<div className="reports__empty-center">Loading…</div>
						) : (
							<GroupedBarChart
								data={groupedProjData}
								height={180}
								colorA="#cbd5e1"
								colorB="#1e293b"
								labelA="Budgeted"
								labelB="Logged"
								emptyMsg="No project data"
							/>
						)}
					</div>

					<div className="reports__table-card">
						<div className="reports__table-header">
							<span className="reports__table-title">
								Project Profitability
							</span>
						</div>
						<table className="reports__table">
							<thead>
								<tr>
									<th>PROJECT</th>
									<th>BUDGETED</th>
									<th>LOGGED</th>
									<th>REMAINING</th>
									<th>BUDGET USED</th>
									<th>HEALTH</th>
								</tr>
							</thead>
							<tbody>
								{paginatedProj.map(
									(
										p: {
											id: string;
											name: string;
											budgeted: number;
											logged: number;
											status: string;
											utilizationPct: number;
										},
										i: number,
									) => {
										const used =
											p.utilizationPct ||
											Math.round(
												((p.logged || 0) / Math.max(1, p.budgeted || 100)) *
													100,
											);
										const health =
											p.status ||
											(used > 100
												? "Over Budget"
												: used > 85
													? "At Risk"
													: "On Track");
										const hb = healthBadge(health);
										const barUsed = Math.min(used, 100);
										const bc =
											used >= 85
												? "#ef4444"
												: used >= 70
													? "#f97316"
													: "#22c55e";
										return (
											<tr key={i}>
												<td>
													<div className="reports__date-control-row">
														<div
															className="reports__progress-dot"
															style={{ background: "#1e293b" }}
														/>
														<span className="reports__text-highlight-purple reports__table-hours-cell reports__table-font-sm">
															{p.name}
														</span>
													</div>
												</td>
												<td className="reports__table-font-sm">
													{p.budgeted || 0}h
												</td>
												<td className="reports__text-highlight-purple reports__table-hours-cell reports__table-font-sm">
													{p.logged || 0}h
												</td>
												<td className="reports__table-font-sm">
													{Math.max(0, (p.budgeted || 0) - (p.logged || 0))}h
												</td>
												<td>
													<div className="reports__date-control-row">
														<div className="reports__util-bar-track">
															<div
																className="reports__util-bar-fill"
																style={{
																	width: `${barUsed}%`,
																	background: bc,
																}}
															/>
														</div>
														<span
															className="reports__util-pct"
															style={{ color: bc }}
														>
															{used}%
														</span>
													</div>
												</td>
												<td>
													<span
														className="badge"
														style={{
															background: hb.bg,
															color: hb.color,
															border: `1px solid ${hb.border}`,
														}}
													>
														{health}
													</span>
												</td>
											</tr>
										);
									},
								)}
								{projectReport.length === 0 && (
									<tr>
										<td colSpan={6} className="reports__empty-center">
											No active project data for profitability reports.
										</td>
									</tr>
								)}
							</tbody>
						</table>
						<Pagination
							currentPage={projPage}
							totalItems={projectReport.length}
							pageSize={pageSize}
							onPageChange={setProjPage}
						/>
					</div>
				</>
			)}

			{/* ── EXPORT CENTER ── */}
			{tab === "export" && (
				<div>
					<p className="reports__export-desc">
						Download formatted reports for payroll processing,{" "}
						<span style={{ color: "#6366f1" }}>client billing</span>, and
						internal management review.
					</p>

					<div
						style={{
							display: "flex",
							gap: 20,
							marginBottom: 24,
							padding: "20px 24px",
							background: "#fff",
							borderRadius: 12,
							border: "1px solid #e5e7eb",
							flexWrap: "wrap",
							alignItems: "flex-end",
							boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
						}}
					>
						<div>
							<label
								style={{
									display: "block",
									fontSize: 12,
									fontWeight: 600,
									marginBottom: 6,
									color: "#4b5563",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Date From
							</label>
							<input
								type="date"
								max={todayStr}
								style={{
									padding: "8px 12px",
									border: "1px solid #d1d5db",
									borderRadius: 6,
									fontSize: 14,
									height: 38,
								}}
								value={exportFrom}
								onChange={(e) => setExportFrom(e.target.value)}
							/>
						</div>

						<div>
							<label
								style={{
									display: "block",
									fontSize: 12,
									fontWeight: 600,
									marginBottom: 6,
									color: "#4b5563",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Date To
							</label>
							<input
								type="date"
								max={todayStr}
								style={{
									padding: "8px 12px",
									border: "1px solid #d1d5db",
									borderRadius: 6,
									fontSize: 14,
									height: 38,
								}}
								value={exportTo}
								onChange={(e) => setExportTo(e.target.value)}
							/>
						</div>

						{(role === "ceo" ||
							role === "hr" ||
							role === "manager" ||
							role === "admin") && (
							<div style={{ flex: "1 1 220px", minWidth: 220 }}>
								<label
									style={{
										display: "block",
										fontSize: 12,
										fontWeight: 600,
										marginBottom: 6,
										color: "#4b5563",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
									}}
								>
									Export Scope / Mode
								</label>
								<select
									value={exportScope}
									onChange={(e) => setExportScope(e.target.value as ExportScope)}
									style={{
										width: "100%",
										padding: "8px 12px",
										border: "1px solid #d1d5db",
										borderRadius: 6,
										fontSize: 14,
										height: 38,
										background: "#fff",
										fontWeight: 500,
									}}
								>
									<option value="self">Self</option>
									<option value="project_all">All Projects</option>
									<option value="employee_all">All Employees</option>
									<option value="employee_single">Employee</option>
									<option value="project_single">Project</option>
									{(role === "ceo" || role === "hr" || role === "admin") && (
										<option value="matrix">Employee-Project Matrix</option>
									)}
								</select>
							</div>
						)}

						{exportScope === "employee_single" && (
							<div className="reports__flex-wrap-col">
								<label className="reports__filter-label">Select Employee</label>
								<select
									value={selectedEmp}
									onChange={(e) => setSelectedEmp(e.target.value)}
									className="reports__select"
								>
									<option value="">Choose Employee…</option>
									{employeesList.map((e: any) => (
										<option key={e.id} value={e.name}>
											{e.name} ({e.department || e.designation || "Employee"})
										</option>
									))}
								</select>
							</div>
						)}

						{exportScope === "project_single" && (
							<div className="reports__flex-wrap-col">
								<label className="reports__filter-label">Select Project</label>
								<select
									value={selectedProj}
									onChange={(e) => setSelectedProj(e.target.value)}
									className="reports__select"
								>
									<option value="">Choose Project…</option>
									{projectsList.map((p: any) => (
										<option key={p.id} value={p.name}>
											{p.name}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					<div className="reports__export-list">
						{[
							{
								fmt: "CSV",
								label: "Timesheet Export (CSV)",
								desc: `Two-section CSV: Summary + Detailed daily entries for ${exportScope === "self" ? "My Self Timesheet" : exportScope.replace("_", " ")}`,
							},
							{
								fmt: "PDF",
								label: "Timesheet Report (PDF)",
								desc: `Two-page PDF: Page 1 Summary + Page 2 Detailed timesheet for ${exportScope === "self" ? "My Self Timesheet" : exportScope.replace("_", " ")}`,
							},
						].map((item, i) => (
							<div className="reports__export-row" key={i}>
								<div className="reports__export-row-icon">
									<DocIcon />
								</div>
								<div className="reports__export-row-info">
									<div className="reports__export-row-title">{item.label}</div>
									<div className="reports__export-row-desc">{item.desc}</div>
								</div>
								<span className="reports__export-fmt">{item.fmt}</span>
								{/* Preview button */}
								<button
									className="reports__export-preview-btn"
									onClick={handlePreview}
									disabled={!exportFrom || !exportTo}
									title="Preview before exporting"
								>
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
										<ellipse cx="8" cy="8" rx="7" ry="4.5" />
										<circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
									</svg>
									Preview
								</button>
								{/* Download button */}
								<button
									className="reports__export-dl-btn"
									onClick={() =>
										item.fmt === "CSV"
											? handleDownloadCsv()
											: handleDownloadPdf()
									}
									disabled={!exportFrom || !exportTo}
								>
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M8 2v8M4 8l4 4 4-4" />
										<path d="M2 14h12" />
									</svg>
									Download {item.fmt}
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{modalConfig && modalConfig.isOpen && (
				<ConfirmModal
					title={modalConfig.title}
					message={modalConfig.message}
					type={modalConfig.type}
					onConfirm={modalConfig.onConfirm}
					onCancel={() => setModalConfig(null)}
				/>
			)}

			{/* ── PREVIEW MODAL ── */}
			{previewOpen && (
				<div
					className="reports__preview-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) setPreviewOpen(false);
					}}
				>
					<div className="reports__preview-modal">
						{/* Modal Header */}
						<div className="reports__preview-modal-header">
							<div>
								<div className="reports__preview-modal-title">
									Timesheet Preview
								</div>
								<div className="reports__preview-modal-meta">
									Period: {fmtDate(exportFrom)} — {fmtDate(exportTo)}
									{selectedEmp && exportScope === "employee_single" && (
										<> · {selectedEmp}</>
									)}
								</div>
							</div>
							<div className="reports__preview-modal-actions">
								<button
									className="reports__export-dl-btn"
									onClick={() => { setPreviewOpen(false); handleDownloadPdf(); }}
								>
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M8 2v8M4 8l4 4 4-4" /><path d="M2 14h12" />
									</svg>
									Download PDF
								</button>
								<button
									className="reports__export-dl-btn"
									onClick={() => { setPreviewOpen(false); handleDownloadCsv(); }}
								>
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M8 2v8M4 8l4 4 4-4" /><path d="M2 14h12" />
									</svg>
									Download CSV
								</button>
								<button
									className="reports__preview-close-btn"
									onClick={() => setPreviewOpen(false)}
									aria-label="Close preview"
								>
									<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M2 2l12 12M14 2L2 14" />
									</svg>
								</button>
							</div>
						</div>

						{/* Page tab switcher */}
						<div className="reports__preview-page-tabs">
							<button
								className={`reports__preview-page-tab${previewPage === 1 ? " reports__preview-page-tab--active" : ""}`}
								onClick={() => setPreviewPage(1)}
							>
								<span className="reports__preview-page-badge">1</span>
								Summary
							</button>
							<button
								className={`reports__preview-page-tab${previewPage === 2 ? " reports__preview-page-tab--active" : ""}`}
								onClick={() => setPreviewPage(2)}
							>
								<span className="reports__preview-page-badge">2</span>
								Detailed Timesheet
							</button>
						</div>

						{/* Modal Body */}
						<div className="reports__preview-modal-body">
							{previewLoading ? (
								<div className="reports__preview-loading">
									<div className="reports__preview-spinner" />
									<span>Loading timesheet data…</span>
								</div>
							) : previewPage === 1 ? (
								/* Page 1: Summary */
								<>
									{/* Summary cards */}
									<div className="reports__preview-summary-grid">
										{[
											{ label: "Total Hours", value: `${Math.round(employeeReport.reduce((s, r) => s + (r.totalHours || 0), 0) * 100) / 100}h` },
											{ label: "Employees", value: employeeReport.length },
											{ label: "Avg Utilization", value: `${employeeReport.length ? Math.round(employeeReport.reduce((s, e) => s + (e.utilization || 0), 0) / employeeReport.length) : 0}%` },
											{ label: "Active Projects", value: projectReport.length },
										].map((c, ci) => (
											<div key={ci} className="reports__preview-summary-card">
												<div className="reports__preview-summary-label">{c.label}</div>
												<div className="reports__preview-summary-value">{c.value}</div>
											</div>
										))}
									</div>

									{/* Employee Hours Summary */}
									<div className="reports__preview-section-title">Employee Hours Summary</div>
									<table className="reports__preview-table">
										<thead>
											<tr>
												<th>Employee</th><th>Department</th><th>Designation</th>
												<th style={{ textAlign: "center" }}>Total Hours</th>
												<th style={{ textAlign: "center" }}>Projects</th>
												<th style={{ textAlign: "center" }}>Utilization</th>
											</tr>
										</thead>
										<tbody>
											{employeeReport.length === 0 ? (
												<tr><td colSpan={6} className="reports__preview-empty">No employee data</td></tr>
											) : employeeReport.map((r, ri) => {
												const util = r.utilization || 0;
												const uc = util >= 85 ? "#16a34a" : util >= 60 ? "#ea580c" : "#dc2626";
												return (
													<tr key={ri}>
														<td>
															<div className="reports__table-employee">
																<div className="reports__table-avatar" style={{ background: r.color || "#6366f1" }}>{r.initials || "U"}</div>
																<span>{r.name}</span>
															</div>
														</td>
														<td style={{ color: "#6b7280" }}>{r.department || "–"}</td>
														<td style={{ color: "#6b7280" }}>{r.designation || "–"}</td>
														<td style={{ textAlign: "center", fontWeight: 600 }}>{Math.round((r.totalHours || 0) * 100) / 100}h</td>
														<td style={{ textAlign: "center" }}>{r.projects}</td>
														<td style={{ textAlign: "center", color: uc, fontWeight: 700 }}>{util}%</td>
													</tr>
												);
											})}
										</tbody>
									</table>

									{/* Project Profitability */}
									<div className="reports__preview-section-title">Project Profitability</div>
									<table className="reports__preview-table">
										<thead>
											<tr>
												<th>Project</th>
												<th style={{ textAlign: "center" }}>Budgeted</th>
												<th style={{ textAlign: "center" }}>Logged</th>
												<th style={{ textAlign: "center" }}>Remaining</th>
												<th style={{ textAlign: "center" }}>Health</th>
											</tr>
										</thead>
										<tbody>
											{projectReport.length === 0 ? (
												<tr><td colSpan={5} className="reports__preview-empty">No project data</td></tr>
											) : projectReport.map((p, pi) => {
												const used = p.utilizationPct || Math.round(((p.logged || 0) / Math.max(1, p.budgeted || 1)) * 100);
												const health = p.status || (used > 100 ? "Over Budget" : used > 85 ? "At Risk" : "On Track");
												const hb = healthBadge(health);
												return (
													<tr key={pi}>
														<td style={{ fontWeight: 500 }}>{p.name}</td>
														<td style={{ textAlign: "center" }}>{p.budgeted || 0}h</td>
														<td style={{ textAlign: "center", color: "#4f46e5", fontWeight: 600 }}>{p.logged || 0}h</td>
														<td style={{ textAlign: "center" }}>{Math.max(0, (p.budgeted || 0) - (p.logged || 0))}h</td>
														<td style={{ textAlign: "center" }}>
															<span className="badge" style={{ background: hb.bg, color: hb.color, border: `1px solid ${hb.border}` }}>{health}</span>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</>
							) : (
								/* Page 2: Detailed */
								<>
									{previewDetailed.length === 0 ? (
										<div className="reports__preview-empty" style={{ padding: "60px 24px" }}>
											No detailed timesheet entries for this period.
										</div>
									) : (
										Array.from(groupByEmployee(previewDetailed).entries()).map(([empName, entries]) => {
											const empTotal = entries.reduce((s, e) => s + e.hours, 0);
											const emp = entries[0];
											return (
												<div key={empName} className="reports__preview-emp-block">
													<div className="reports__preview-emp-header">
														<div className="reports__table-employee">
															<div className="reports__table-avatar" style={{ background: emp.color || "#6366f1" }}>{emp.initials || "U"}</div>
															<div>
																<div style={{ fontWeight: 700, fontSize: 13 }}>{empName}</div>
																<div style={{ fontSize: 11, color: "#6b7280" }}>{emp.department} · {emp.designation}</div>
															</div>
														</div>
														<div className="reports__preview-emp-total">
															Total: <strong>{Math.round(empTotal * 100) / 100}h</strong>
														</div>
													</div>
													<table className="reports__preview-table">
														<thead>
															<tr>
																<th>Date</th><th>Project</th><th>Task</th>
																<th style={{ textAlign: "center" }}>Hours</th>
																<th style={{ textAlign: "center" }}>Status</th>
															</tr>
														</thead>
														<tbody>
															{entries.map((e, ei) => {
																const statusBg = e.status === "Approved" ? { bg: "#dcfce7", color: "#16a34a" } : e.status === "Rejected" ? { bg: "#fee2e2", color: "#dc2626" } : { bg: "#f3f4f6", color: "#6b7280" };
																return (
																	<tr key={ei}>
																		<td style={{ whiteSpace: "nowrap" }}>{fmtDate(e.date)}</td>
																		<td style={{ color: "#4f46e5", fontWeight: 500 }}>{e.projectName}</td>
																		<td style={{ color: "#374151", maxWidth: 240, wordBreak: "break-word" }}>{e.taskName}</td>
																		<td style={{ textAlign: "center", fontWeight: 700 }}>{e.hours}h</td>
																		<td style={{ textAlign: "center" }}>
																			<span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: statusBg.bg, color: statusBg.color }}>
																				{e.status || "Pending"}
																			</span>
																		</td>
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>
											);
										})
									)}
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
