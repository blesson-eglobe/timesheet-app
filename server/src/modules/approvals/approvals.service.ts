import { query } from "../../config/db";
import { createError } from "../../middleware/errorHandler";

export const approvalsService = {
	async list(
		userRole: string,
		filter?: string,
		managerId?: string,
		searchName?: string,
		searchDate?: string,
		currentUserId?: string,
	) {
		let sql = `
      SELECT wl.id AS id, 
             wl.id AS timesheet_id, 
        CASE WHEN wl.status IN ('Approved', 'Rejected') THEN wl.status ELSE 'Pending' END AS status, '' AS comments, NULL AS manager_id,
        DATE(wl.date) AS week_start, DATE(wl.date) AS week_end, wl.hours AS hours, wl.created_at AS created_at,
        u.id AS user_id, u.first_name, u.last_name, u.initials, u.color, u.designation, u.role,
        p.name AS project_names, wl.task_name, wl.task_description
      FROM work_logs wl
      JOIN users u ON u.id = wl.user_id
      LEFT JOIN projects p ON p.id = wl.project_id
      WHERE wl.status != 'Draft'`;

		const params: unknown[] = [];

		if (currentUserId && userRole !== 'ceo' && userRole !== 'hr' && userRole !== 'admin') {
			params.push(currentUserId);
			sql += ` AND wl.user_id != $${params.length}`;
		}

		// if (userRole === "admin") {
		// 	sql += ` AND (u.role = 'manager' OR LOWER(u.designation) LIKE '%lead%')`;
		// }

		if (managerId) {
			params.push(managerId);
			sql += ` AND EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = wl.project_id 
              AND pm.user_id = $${params.length}
        )`;
		}

		if (filter && filter !== "All") {
			if (filter === "Pending") {
				sql += ` AND wl.status NOT IN ('Approved', 'Rejected', 'Draft')`;
			} else {
				params.push(filter);
				sql += ` AND wl.status = $${params.length}`;
			}
		}

		if (searchName) {
			params.push(`%${searchName.toLowerCase()}%`);
			sql += ` AND (LOWER(u.first_name) LIKE $${params.length} OR LOWER(u.last_name) LIKE $${params.length} OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $${params.length})`;
		}

		if (searchDate) {
			params.push(searchDate);
			sql += ` AND DATE(wl.date) = $${params.length}`;
		}

		sql += " ORDER BY wl.date DESC, wl.created_at DESC";

		const res = await query(sql, params);

		return res.rows.map((r: Record<string, unknown>) => {
			const dStr = String(r["week_start"] || "").split("T")[0];
			const endStr = String(r["week_end"] || "").split("T")[0];
			const formattedDate = dStr
				? new Date(dStr + "T12:00:00").toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					})
				: "N/A";

			return {
				id: r["id"],
				timesheetId: r["timesheet_id"],
				employee: {
					id: r["user_id"],
					name: `${r["first_name"]} ${r["last_name"]}`,
					initials: r["initials"],
					color: r["color"],
					designation: r["designation"],
					role: r["role"],
				},
				period: formattedDate,
				projects: ((r["project_names"] as string) || "No Projects")
					.split(", ")
					.filter(Boolean),
				taskName: r["task_name"] || "Work Log Task",
				taskDescription: r["task_description"] || "",
				hours: Number(r["hours"]),
				submittedDate: formattedDate,
				submittedDateRaw: dStr,
				timesheetAsSubmitted: formattedDate,
				weekStart: dStr,
				weekEnd: dStr,
				status: r["status"] || "Pending",
				comments: r["comments"] || "",
			};
		});
	},

	async approve(id: string, managerId: string) {
		await query(`UPDATE work_logs SET status='Approved' WHERE id=$1`, [id]);
		await query(
			`UPDATE approvals SET status='Approved', manager_id=$2, approved_at=NOW()
       WHERE id=$1 OR timesheet_id=$1`,
			[id, managerId],
		);
		await query(
			`UPDATE timesheets SET status='Approved', updated_at=NOW() WHERE id=$1 OR id=(SELECT timesheet_id FROM approvals WHERE id=$1 LIMIT 1)`,
			[id],
		);
		return { success: true, id, status: "Approved" };
	},

	async reject(id: string, managerId: string, comments: string) {
		await query(`UPDATE work_logs SET status='Rejected' WHERE id=$1`, [id]);
		await query(
			`UPDATE approvals SET status='Rejected', manager_id=$2, comments=$3
       WHERE id=$1 OR timesheet_id=$1`,
			[id, managerId, comments],
		);
		await query(
			`UPDATE timesheets SET status='Rejected', updated_at=NOW() WHERE id=$1 OR id=(SELECT timesheet_id FROM approvals WHERE id=$1 LIMIT 1)`,
			[id],
		);
		return { success: true, id, status: "Rejected" };
	},

	async bulkApprove(ids: string[], managerId: string) {
		for (const id of ids) {
			await approvalsService.approve(id, managerId);
		}
		return { approved: ids.length };
	},

	async bulkReject(ids: string[], managerId: string, comments: string) {
		for (const id of ids) {
			await approvalsService.reject(
				id,
				managerId,
				comments || "Bulk rejected.",
			);
		}
		return { rejected: ids.length };
	},

	async updateTimesheet(
		id: string,
		body: {
			taskName?: string;
			taskDescription?: string;
			hours?: number;
			date?: string;
			status?: string;
		},
	) {
		if (
			body.taskName !== undefined ||
			body.taskDescription !== undefined ||
			body.hours !== undefined ||
			body.date !== undefined ||
			body.status !== undefined
		) {
			await query(
				`UPDATE work_logs 
         SET task_name = COALESCE($2, task_name),
             task_description = COALESCE($3, task_description),
             hours = COALESCE($4, hours),
             date = COALESCE($5, date),
             status = COALESCE($6, status)
         WHERE id = $1 OR timesheet_id = $1`,
				[
					id,
					body.taskName,
					body.taskDescription,
					body.hours,
					body.date,
					body.status,
				],
			);
		}
		if (body.status) {
			await query(
				`UPDATE approvals SET status = $2 WHERE id = $1 OR timesheet_id = $1`,
				[id, body.status],
			);
			await query(
				`UPDATE timesheets SET status = $2 WHERE id = $1 OR id = (SELECT timesheet_id FROM approvals WHERE id = $1 LIMIT 1)`,
				[id, body.status],
			);
		}
		return { success: true, id };
	},

	async getDetails(id: string) {
		const cleanUserId = id.startsWith("user_") ? id.replace("user_", "") : id;

		const wlCheck = await query(
			`SELECT wl.*, p.name AS project_name, u.first_name, u.last_name, u.initials, u.color, u.designation, u.department
       FROM work_logs wl
       JOIN users u ON u.id = wl.user_id
       LEFT JOIN projects p ON p.id = wl.project_id
       WHERE wl.id = $1 OR u.id = $2
       ORDER BY wl.date DESC LIMIT 1`,
			[id, cleanUserId],
		);
		if (wlCheck.rows[0]) {
			const l = wlCheck.rows[0] as Record<string, unknown>;
			const dStr = String(l["date"] || "").split("T")[0];
			return {
				approval: {
					id: l["id"],
					timesheetId: l["id"],
					status: l["status"] || "Submitted",
					comments: "",
					hours: Number(l["hours"]),
					weekStart: dStr,
					weekEnd: dStr,
					submittedAt: l["created_at"] || l["date"],
					employee: {
						id: l["user_id"],
						name: `${l["first_name"]} ${l["last_name"]}`,
						initials: l["initials"],
						color: l["color"],
						designation: l["designation"],
						department: l["department"],
					},
				},
				logs: [
					{
						id: l["id"],
						date: dStr,
						projectName: l["project_name"] || "General Task",
						taskName: l["task_name"] || "Work Log Task",
						taskDescription: l["task_description"] || "",
						hours: Number(l["hours"]),
						status: l["status"] || "Submitted",
					},
				],
			};
		}

		const res = await query(
			`SELECT a.*, 
        ts.week_start, ts.week_end, ts.total_hours, ts.submitted_at, ts.user_id,
        u.first_name, u.last_name, u.initials, u.color, u.designation, u.department
       FROM approvals a
       JOIN timesheets ts ON ts.id = a.timesheet_id
       JOIN users u ON u.id = ts.user_id
       WHERE a.id = $1`,
			[id],
		);
		if (!res.rows[0]) throw createError("Approval not found", 404, "NOT_FOUND");
		const r = res.rows[0] as Record<string, unknown>;

		let logsRes = await query(
			`SELECT wl.*, p.name AS project_name
       FROM work_logs wl
       JOIN projects p ON p.id = wl.project_id
       WHERE wl.user_id = $1 AND wl.date >= $2 AND wl.date <= $3
       ORDER BY wl.date ASC, wl.created_at ASC`,
			[r["user_id"], r["week_start"], r["week_end"]],
		);

		if (logsRes.rows.length === 0 && r["submitted_at"]) {
			logsRes = await query(
				`SELECT wl.*, p.name AS project_name
         FROM work_logs wl
         JOIN projects p ON p.id = wl.project_id
         WHERE wl.user_id = $1 AND wl.date = DATE($2)
         ORDER BY wl.date ASC, wl.created_at ASC`,
				[r["user_id"], r["submitted_at"]],
			);
		}
		if (logsRes.rows.length === 0) {
			logsRes = await query(
				`SELECT wl.*, p.name AS project_name
         FROM work_logs wl
         JOIN projects p ON p.id = wl.project_id
         WHERE wl.user_id = $1 AND wl.date = DATE($2)
         ORDER BY wl.date ASC, wl.created_at ASC`,
				[r["user_id"], r["week_start"]],
			);
		}

		const logs = logsRes.rows.map((l: Record<string, unknown>) => ({
			id: l["id"],
			date: String(l["date"] || "").split("T")[0],
			projectName: l["project_name"] || "General Task",
			taskName: l["task_name"] || "Work Log",
			taskDescription: l["task_description"] || "",
			hours: Number(l["hours"]),
			status:
				(["Approved", "Rejected"].includes(String(l["status"]))
					? l["status"]
					: "Pending") || "Pending",
		}));

		const overallStatus = logs.some((l) => l.status === "Rejected")
			? "Rejected"
			: logs.every((l) => l.status === "Approved")
				? "Approved"
				: "Pending";

		return {
			approval: {
				id: r["id"],
				timesheetId: r["timesheet_id"],
				status: r["status"],
				comments: r["comments"] || "",
				hours: Number(r["total_hours"]),
				weekStart: String(r["week_start"] || "").split("T")[0],
				weekEnd: String(r["week_end"] || "").split("T")[0],
				submittedAt: r["submitted_at"],
				employee: {
					id: r["user_id"],
					name: `${r["first_name"]} ${r["last_name"]}`,
					initials: r["initials"],
					color: r["color"],
					designation: r["designation"],
					department: r["department"],
				},
			},
			logs,
		};
	},
};
