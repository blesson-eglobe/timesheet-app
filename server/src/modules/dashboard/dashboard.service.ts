import { query } from "../../config/db";

const formatDashboardProject = (p: Record<string, unknown>) => {
	const totalHours = Number(p["estimated_hours"]) || 0;
	const loggedHours =
		Number(
			p["actual_logged_hours"] !== undefined
				? p["actual_logged_hours"]
				: p["logged_hours"]
		) || 0;
	const isInternal = p["project_type"] === "Internal" || p["id"] === "internal" || String(p["name"]).toLowerCase() === "internal";
	const hasBudget = totalHours > 0 && !isInternal;
	const totalTasks = Number(p["total_tasks"]) || 0;
	const completedTasks = Number(p["completed_tasks"]) || 0;
	const approvedTasks = Number(p["approved_tasks"]) || 0;
	const dbProgress = Number(p["progress"]) || 0;

	let progress = 0;
	let progressMode: "budget" | "activity" | "none" = "none";

	if (p["status"] === "Completed") {
		progress = 100;
		progressMode = "budget";
	} else if (hasBudget) {
		progressMode = "budget";
		const rawProgress = (loggedHours / totalHours) * 100;
		progress = rawProgress > 0 && rawProgress < 1
			? Math.round(rawProgress * 10) / 10
			: Math.min(100, Math.round(rawProgress));
	} else if (totalTasks > 0 && completedTasks > 0) {
		// No budget but has completed/approved tasks — use task completion ratio
		progressMode = "activity";
		progress = Math.round((completedTasks / totalTasks) * 100);
	} else if (loggedHours > 0) {
		// No budget, no completed tasks, but hours are logged — activity-based
		progressMode = "activity";
		if (totalTasks > 0 && approvedTasks > 0) {
			// Use approved logs ratio as progress indicator
			progress = Math.min(95, Math.round((approvedTasks / totalTasks) * 100));
		} else if (dbProgress > 0) {
			progress = dbProgress;
		} else {
			// Heuristic: give a base 5% for having any activity, scale with logged hours
			progress = Math.min(95, Math.max(5, Math.round(loggedHours * 2)));
		}
	} else {
		progress = dbProgress;
	}

	return {
		id: p["id"],
		name: p["name"],
		status: p["status"],
		priority: p["priority"],
		progress,
		progressMode,
		totalHours,
		loggedHours,
		hasBudget,
		dueDate: p["end_date"]
			? new Date(p["end_date"] as string).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				})
			: "",
	};
};

export const dashboardService = {
	async employee(userId: string) {
		const today = new Date().toISOString().slice(0, 10);
		const weekStart = getWeekStart(new Date());
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 6);

		// Today's hours
		const todayRes = await query(
			`SELECT COALESCE(SUM(hours),0) AS hours FROM work_logs WHERE user_id=$1 AND date=$2`,
			[userId, today],
		);
		const todayHours = Number(
			(todayRes.rows[0] as Record<string, unknown>)["hours"],
		);

		// Week hours per day
		const weekRes = await query(
			`SELECT date, COALESCE(SUM(hours),0) AS hours FROM work_logs
       WHERE user_id=$1 AND date >= $2 AND date <= $3
       GROUP BY date ORDER BY date`,
			[userId, weekStart, weekEnd.toISOString().slice(0, 10)],
		);
		const dayMap: Record<string, number> = {};
		for (const r of weekRes.rows as Record<string, unknown>[]) {
			const dStr = String(r["date"] || "").split("T")[0];
			dayMap[dStr] = Number(r["hours"]);
		}
		const days = ["MON", "TUE", "WED", "THU", "FRI"];
		const weekHours = days.map((day, i) => {
			const d = new Date(weekStart);
			d.setDate(d.getDate() + i);
			const dateStr = d.toISOString().slice(0, 10);
			return {
				day,
				date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
				hours: dayMap[dateStr] || 0,
				target: 8,
				isToday: dateStr === today,
			};
		});
		const weekTotal = weekHours.reduce((sum, d) => sum + d.hours, 0);

		// Assigned projects (strictly projects where user is in project_members)
		const projectsRes = await query(
			`SELECT p.id, p.name, p.status, p.priority, p.progress, p.estimated_hours, p.logged_hours, p.end_date,
              COALESCE((SELECT SUM(wl.hours) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS actual_logged_hours,
              COALESCE((SELECT COUNT(wl.id) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS total_tasks,
              COALESCE((SELECT COUNT(CASE WHEN wl.task_status = 'Completed' OR wl.status = 'Approved' THEN 1 END) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS completed_tasks,
              COALESCE((SELECT COUNT(CASE WHEN wl.status = 'Approved' THEN 1 END) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS approved_tasks
       FROM projects p JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = $1 ORDER BY p.updated_at DESC LIMIT 3`,
			[userId],
		);

		// Recent activity (user's own logs)
		const activityRes = await query(
			`SELECT wl.*, p.name AS project_name, u.initials, u.color
       FROM work_logs wl JOIN projects p ON p.id = wl.project_id JOIN users u ON u.id = wl.user_id
       WHERE wl.user_id=$1 ORDER BY wl.created_at DESC LIMIT 5`,
			[userId],
		);

		return {
			todayHours,
			weekTotal,
			weekHours,
			activeProjects: projectsRes.rows.length,
			projects: (projectsRes.rows as Record<string, unknown>[]).map(formatDashboardProject),
			recentActivity: activityRes.rows.map((r: Record<string, unknown>) => ({
				id: r["id"],
				userInitials: r["initials"],
				userColor: r["color"],
				message: `You logged ${r["hours"]}h on ${r["project_name"]}`,
				time: formatTime(r["created_at"] as Date),
			})),
		};
	},

	async manager(userRole: string, managerId: string) {
		const pendingSql = userRole === 'admin' 
			? `(SELECT COUNT(wl.id) FROM work_logs wl JOIN users u ON u.id = wl.user_id WHERE wl.status NOT IN ('Approved', 'Rejected', 'Draft'))`
			: `(SELECT COUNT(wl.id) FROM work_logs wl JOIN users u ON u.id = wl.user_id WHERE wl.status NOT IN ('Approved', 'Rejected', 'Draft') AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = wl.project_id AND pm.user_id = $1))`;

		const params = userRole === 'admin' ? [] : [managerId];

		// Stats
		const statsRes = await query(
			`SELECT
        (SELECT COUNT(*) FROM users WHERE status='Active') AS total_employees,
        (SELECT COUNT(DISTINCT department) FROM users WHERE status='Active' AND department != '') AS total_departments,
        (SELECT COUNT(*) FROM projects WHERE status != 'Completed') AS active_projects,
        ${pendingSql} AS pending_approvals`,
			params,
		);
		const stats = statsRes.rows[0] as Record<string, unknown>;

		// Monthly hours (last 6 months)
		const monthlyParams = userRole === 'admin' ? [] : [managerId];
		const monthlySql = `SELECT DATE_FORMAT(wl.date, '%b') AS month, COALESCE(SUM(wl.hours),0) AS hours
       FROM work_logs wl JOIN users u ON u.id = wl.user_id
       WHERE wl.date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       ${userRole === 'admin' ? "" : "AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = wl.project_id AND pm.user_id = $1)"}
       GROUP BY DATE_FORMAT(wl.date, '%Y-%m'), DATE_FORMAT(wl.date, '%b')
       ORDER BY DATE_FORMAT(wl.date, '%Y-%m')`;
		const monthlyRes = await query(monthlySql, monthlyParams);

		// Dept utilization
		const deptParams = userRole === 'admin' ? [] : [managerId];
		const deptSql = `SELECT u.department,
         COALESCE(
           ROUND(SUM(wl.hours) / NULLIF(COUNT(DISTINCT u.id) * 40.0, 0) * 100),
           0
         ) AS utilization
       FROM users u
       LEFT JOIN work_logs wl ON wl.user_id = u.id 
         AND wl.date >= DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY)
         AND wl.date < DATE_ADD(DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY), INTERVAL 7 DAY)
       WHERE u.status='Active' AND u.department != ''
       ${userRole === 'admin' ? "" : "AND EXISTS (SELECT 1 FROM project_members pm1 JOIN project_members pm2 ON pm1.project_id = pm2.project_id WHERE pm1.user_id = u.id AND pm2.user_id = $1)"}
       GROUP BY u.department ORDER BY utilization DESC`;
		const deptRes = await query(deptSql, deptParams);

		const colors = ["#22C55E", "#F97316", "#3B82F6", "#8B5CF6", "#EF4444"];
		const deptUtil = (deptRes.rows as Record<string, unknown>[]).map(
			(d, i) => ({
				dept: d["department"],
				utilization: Math.min(100, Number(d["utilization"])),
				color:
					Number(d["utilization"]) >= 85
						? "#22C55E"
						: Number(d["utilization"]) >= 70
							? "#F97316"
							: "#EF4444",
			}),
		);

		// Recent activity
		const activityParams = userRole === 'admin' ? [] : [managerId];
		const activitySql = `SELECT wl.*, p.name AS project_name, u.first_name, u.last_name, u.initials, u.color
       FROM work_logs wl JOIN projects p ON p.id = wl.project_id JOIN users u ON u.id = wl.user_id
       WHERE 1=1
       ${userRole === 'admin' ? "" : "AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = wl.project_id AND pm.user_id = $1)"}
       ORDER BY wl.created_at DESC LIMIT 6`;
		const activityRes = await query(activitySql, activityParams);

		// Assigned projects (Manager's own projects or all for Admin)
		const projectsRes = await query(
			`SELECT p.id, p.name, p.status, p.priority, p.progress, p.estimated_hours, p.logged_hours, p.end_date,
              COALESCE((SELECT SUM(wl.hours) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS actual_logged_hours,
              COALESCE((SELECT COUNT(wl.id) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS total_tasks,
              COALESCE((SELECT COUNT(CASE WHEN wl.task_status = 'Completed' OR wl.status = 'Approved' THEN 1 END) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS completed_tasks,
              COALESCE((SELECT COUNT(CASE WHEN wl.status = 'Approved' THEN 1 END) FROM work_logs wl WHERE wl.project_id = p.id), 0) AS approved_tasks
       FROM projects p ${userRole === 'admin' ? "" : "JOIN project_members pm ON pm.project_id = p.id"}
       WHERE 1=1 ${userRole === 'admin' ? "" : "AND pm.user_id = $1"} ORDER BY p.updated_at DESC LIMIT 3`,
			userRole === 'admin' ? [] : [managerId],
		);

		// Employee table
		const empParams = userRole === 'admin' ? [managerId, managerId, managerId, managerId] : [managerId, managerId, managerId, managerId, managerId];
		const empSql = `SELECT u.id, u.first_name, u.last_name, u.initials, u.color, u.designation, u.department, u.status, u.role,
         (SELECT COUNT(*) FROM project_members pm WHERE pm.user_id = u.id) AS projects,
         COALESCE(
           NULLIF((SELECT SUM(hours) FROM work_logs wl 
                   WHERE wl.user_id = u.id AND wl.date >= DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY)
                   AND wl.date < DATE_ADD(DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY), INTERVAL 7 DAY)), 0),
           COALESCE((SELECT SUM(hours) FROM work_logs wl WHERE wl.user_id = u.id AND wl.status != 'Draft'), 0)
         ) AS week_hours,
         COALESCE(
           (SELECT wl.status FROM work_logs wl WHERE wl.user_id = u.id AND wl.status != 'Draft' ORDER BY wl.date DESC, wl.created_at DESC LIMIT 1),
           (SELECT a.status FROM approvals a JOIN timesheets t ON t.id = a.timesheet_id WHERE t.user_id = u.id AND (a.manager_id = $1 OR (a.manager_id IS NULL AND t.user_id != $2)) ORDER BY t.week_start DESC LIMIT 1),
           (SELECT t.status FROM timesheets t WHERE t.user_id = u.id ORDER BY week_start DESC LIMIT 1),
           'Not Started'
         ) AS timesheet_status
       FROM users u WHERE u.status='Active' 
       ${userRole === 'admin' ? "" : "AND EXISTS (SELECT 1 FROM project_members pm1 JOIN project_members pm2 ON pm1.project_id = pm2.project_id WHERE pm1.user_id = u.id AND pm2.user_id = $5)"}
       ORDER BY CASE 
         WHEN COALESCE(
           (SELECT wl.status FROM work_logs wl WHERE wl.user_id = u.id AND wl.status != 'Draft' ORDER BY wl.date DESC, wl.created_at DESC LIMIT 1),
           (SELECT a.status FROM approvals a JOIN timesheets t ON t.id = a.timesheet_id WHERE t.user_id = u.id AND (a.manager_id = $3 OR (a.manager_id IS NULL AND t.user_id != $4)) ORDER BY t.week_start DESC LIMIT 1),
           (SELECT t.status FROM timesheets t WHERE t.user_id = u.id ORDER BY week_start DESC LIMIT 1)
         ) = 'Pending' THEN 1 
         WHEN COALESCE(
           (SELECT wl.status FROM work_logs wl WHERE wl.user_id = u.id AND wl.status != 'Draft' ORDER BY wl.date DESC, wl.created_at DESC LIMIT 1),
           (SELECT a.status FROM approvals a JOIN timesheets t ON t.id = a.timesheet_id WHERE t.user_id = u.id ORDER BY t.week_start DESC LIMIT 1),
           (SELECT t.status FROM timesheets t WHERE t.user_id = u.id ORDER BY week_start DESC LIMIT 1)
         ) = 'Submitted' THEN 2 
         ELSE 3 
       END, u.first_name`;
		const empRes = await query(empSql, empParams);

		return {
			totalEmployees: Number(stats["total_employees"]),
			totalDepartments: Number(stats["total_departments"]),
			activeProjects: Number(stats["active_projects"]),
			pendingApprovals: Number(stats["pending_approvals"]),
			monthlyHours: (monthlyRes.rows as Record<string, unknown>[]).map((r) => ({
				month: r["month"],
				hours: Number(r["hours"]),
			})),
			deptUtilization: deptUtil,
			projects: (projectsRes.rows as Record<string, unknown>[]).map(formatDashboardProject),
			employeeTable: (empRes.rows as Record<string, unknown>[]).map((u) => ({
				user: {
					id: u["id"],
					name: `${u["first_name"]} ${u["last_name"]}`,
					initials: u["initials"],
					color: u["color"],
					designation: u["designation"],
					department: u["department"],
					role: u["role"] || "Staff",
					email: "",
				},
				status: u["status"],
				projects: Number(u["projects"]),
				weekHours: Number(u["week_hours"]),
				utilization: Math.min(
					100,
					Math.round((Number(u["week_hours"]) / 40) * 100),
				),
				timesheetStatus: u["timesheet_status"],
			})),
			recentActivity: (activityRes.rows as Record<string, unknown>[]).map(
				(r) => ({
					id: r["id"],
					userId: r["user_id"],
					userInitials: r["initials"],
					userColor: r["color"],
					message: `${r["first_name"]} logged ${r["hours"]}h on ${r["project_name"]}`,
					time: formatTime(r["created_at"] as Date),
				}),
			),
		};
	},
};

function getWeekStart(date: Date): string {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	return d.toISOString().slice(0, 10);
}

function formatTime(date: Date): string {
	const now = new Date();
	const d = new Date(date);
	const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 172800) return "Yesterday";
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
