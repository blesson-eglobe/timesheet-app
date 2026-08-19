import { query } from "../../config/db";

export const reportsService = {
	async detailedExport(
		params: { from?: string; to?: string; scope?: string; empName?: string },
		userRole: string,
		requesterId: string,
	) {
		const from =
			params.from ||
			new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
		const to = params.to || new Date().toISOString().slice(0, 10);

		const isElevated =
			userRole === "admin" || userRole === "ceo" || userRole === "hr";
		const queryParams: unknown[] = [from, to];
		let idx = 3;
		let extraWhere = "";

		if (userRole === "employee" || params.scope === "self") {
			extraWhere += ` AND u.id = $${idx++}`;
			queryParams.push(requesterId);
		} else if (params.scope === "employee_single" && params.empName) {
			extraWhere += ` AND CONCAT(u.first_name, ' ', u.last_name) = $${idx++}`;
			queryParams.push(params.empName);
		} else if (!isElevated && userRole === "manager") {
			// Manager sees only their project members
			extraWhere += ` AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = wl.project_id AND pm.user_id = $${idx++})`;
			queryParams.push(requesterId);
		}

		const sql = `SELECT
        CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
        u.initials, u.color, u.department, u.designation,
        wl.date, p.name AS project_name,
        wl.task_name, wl.hours, wl.status
      FROM work_logs wl
      JOIN users u ON u.id = wl.user_id
      LEFT JOIN projects p ON p.id = wl.project_id
      WHERE wl.date >= $1 AND wl.date <= $2
        ${extraWhere}
      ORDER BY CONCAT(u.first_name, ' ', u.last_name), wl.date DESC`;

		const res = await query(sql, queryParams);
		return (res.rows as Record<string, unknown>[]).map((r) => ({
			employeeName: String(r["employee_name"] || ""),
			initials: String(r["initials"] || ""),
			color: String(r["color"] || "#6366f1"),
			department: String(r["department"] || ""),
			designation: String(r["designation"] || ""),
			date: String(r["date"] || "").split("T")[0],
			projectName: String(r["project_name"] || "General"),
			taskName: String(r["task_name"] || ""),
			hours: Number(r["hours"] || 0),
			status: String(r["status"] || ""),
		}));
	},

	async hoursReport(
		params: { from?: string; to?: string; userId?: string },
		userRole: string,
		requesterId: string,
	) {
		const from =
			params.from ||
			new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
		const to = params.to || new Date().toISOString().slice(0, 10);

		const isElevated =
			userRole === "admin" || userRole === "ceo" || userRole === "hr";
		const isManager = userRole === "manager";
		const roleFilterU = isElevated
			? ""
			: isManager
				? "AND EXISTS (SELECT 1 FROM project_members pm1 JOIN project_members pm2 ON pm1.project_id = pm2.project_id WHERE pm1.user_id = u.id AND pm2.user_id = ?)"
				: "AND u.id = ?";
		const roleFilterWL = isElevated
			? ""
			: isManager
				? "AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = wl.project_id AND pm.user_id = ?)"
				: "AND wl.user_id = ?";
		const reqParam = isElevated ? [] : [requesterId];

		// Monthly totals
		const monthlySql = `SELECT DATE_FORMAT(wl.date, '%b') AS month,
              DATE_FORMAT(wl.date, '%Y-%m') AS month_key,
              COALESCE(SUM(wl.hours),0) AS hours
       FROM work_logs wl JOIN users u ON u.id = wl.user_id 
       WHERE wl.date >= ? AND wl.date <= ?
       ${params.userId ? "AND wl.user_id=?" : ""}
       ${roleFilterWL}
       GROUP BY DATE_FORMAT(wl.date, '%Y-%m'), DATE_FORMAT(wl.date, '%b')
       ORDER BY DATE_FORMAT(wl.date, '%Y-%m')`;
		const monthlyRes = await query(
			monthlySql,
			params.userId
				? [from, to, params.userId, ...reqParam]
				: [from, to, ...reqParam],
		);

		// Utilization by dept
		const deptSql = `SELECT u.department,
         ROUND(AVG(
           COALESCE((
             SELECT SUM(wl.hours) FROM work_logs wl
             WHERE wl.user_id = u.id AND wl.date >= ? AND wl.date <= ?
           ), 0) / 40 * 100
         )) AS utilization
       FROM users u WHERE u.status='Active' AND u.department != ''
       ${roleFilterU}
       GROUP BY u.department ORDER BY utilization DESC`;
		const deptRes = await query(deptSql, [from, to, ...reqParam]);

		// Overtime (> 40h in a week)
		const overtimeSql = `SELECT CONCAT(u.first_name, ' ', u.last_name) AS name, u.initials, u.color, u.department,
         COUNT(*) AS overtime_weeks,
         COALESCE(SUM(wl.hours),0) AS total_hours
       FROM users u
       JOIN (
         SELECT wl2.user_id, YEARWEEK(wl2.date, 1) AS week,
                SUM(wl2.hours) AS week_total
         FROM work_logs wl2
         WHERE wl2.date >= ? AND wl2.date <= ?
         GROUP BY wl2.user_id, YEARWEEK(wl2.date, 1)
         HAVING SUM(wl2.hours) > 40
       ) ot ON ot.user_id = u.id
       LEFT JOIN work_logs wl ON wl.user_id = u.id AND wl.date >= ? AND wl.date <= ?
       WHERE 1=1 ${roleFilterU}
       GROUP BY u.id, u.first_name, u.last_name, u.initials, u.color, u.department ORDER BY overtime_weeks DESC LIMIT 10`;
		const overtimeRes = await query(overtimeSql, [
			from,
			to,
			from,
			to,
			...reqParam,
		]);

		// Employee hours table
		const empSql = `SELECT CONCAT(u.first_name, ' ', u.last_name) AS name, u.initials, u.color,
              u.department, u.designation,
              COALESCE(SUM(wl.hours),0) AS total_hours,
              COUNT(DISTINCT wl.project_id) AS projects
       FROM users u
       LEFT JOIN work_logs wl ON wl.user_id = u.id AND wl.date >= ? AND wl.date <= ?
       WHERE u.status='Active' ${roleFilterU}
       GROUP BY u.id, u.first_name, u.last_name, u.initials, u.color, u.department, u.designation ORDER BY total_hours DESC`;
		const empRes = await query(empSql, [from, to, ...reqParam]);

		// Project report
		const projSql = `SELECT p.id, p.name, p.status, p.estimated_hours, p.logged_hours,
              ROUND(p.logged_hours / NULLIF(p.estimated_hours, 0) * 100) AS utilization_pct,
              COUNT(DISTINCT pm.user_id) AS team_size
       FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE 1=1 ${userRole === "manager" ? "AND EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = p.id AND pm2.user_id = ?)" : ""}
       GROUP BY p.id, p.name, p.status, p.estimated_hours, p.logged_hours ORDER BY p.logged_hours DESC`;
		const projRes = await query(
			projSql,
			userRole === "manager" ? [requesterId] : [],
		);

		return {
			monthlyHours: (monthlyRes.rows as Record<string, unknown>[]).map((r) => ({
				month: r["month"],
				hours: Number(r["hours"]),
			})),
			deptUtilization: (deptRes.rows as Record<string, unknown>[]).map((r) => ({
				dept: r["department"],
				utilization: Math.min(100, Number(r["utilization"])),
				color: Number(r["utilization"]) >= 85 ? "#22C55E" : "#F97316",
			})),
			overtimeReport: (overtimeRes.rows as Record<string, unknown>[]).map(
				(r) => ({
					name: r["name"],
					initials: r["initials"],
					color: r["color"],
					department: r["department"],
					overtimeWeeks: Number(r["overtime_weeks"]),
					totalHours: Math.round(Number(r["total_hours"]) * 100) / 100,
				}),
			),
			employeeReport: (empRes.rows as Record<string, unknown>[]).map((r) => ({
				name: r["name"],
				initials: r["initials"],
				color: r["color"],
				department: r["department"],
				designation: r["designation"],
				totalHours: Math.round(Number(r["total_hours"]) * 100) / 100,
				projects: Number(r["projects"]),
				utilization: Math.min(
					100,
					Math.round((Number(r["total_hours"]) / (40 * 4)) * 100),
				),
			})),
			projectReport: (projRes.rows as Record<string, unknown>[]).map((r) => ({
				id: r["id"],
				name: r["name"],
				status: r["status"],
				budgeted: Number(r["estimated_hours"]),
				logged: Number(r["logged_hours"]),
				utilizationPct: Number(r["utilization_pct"]) || 0,
				teamSize: Number(r["team_size"]),
			})),
		};
	},
};
