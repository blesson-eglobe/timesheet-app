import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';

export const reportsController = {
  async hours(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, userId } = req.query as Record<string, string>;
      const data = await reportsService.hoursReport({ from, to, userId }, req.user!.role, req.user!.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, scope } = req.query as Record<string, string>;
      const targetUserId = scope === 'self' ? req.user!.id : undefined;
      const data = await reportsService.hoursReport({ from, to, userId: targetUserId }, req.user!.role, req.user!.id);
      const empList = data.employeeReport;
      const rows = empList.map(r =>
        [String(r.name || ''), String(r.department || ''), String(r.designation || ''), String(r.totalHours || 0), String(r.projects || 0), String(r.utilization || 0) + '%'].join(',')
      );
      const csv = ['Name,Department,Designation,Total Hours,Projects,Utilization', ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${scope === 'self' ? 'self_timesheet' : 'report'}.csv`);
      res.send(csv);
    } catch (err) { next(err); }
  },
};
