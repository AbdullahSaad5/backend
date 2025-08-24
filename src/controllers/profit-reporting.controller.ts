import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ProfitReportingService } from "@/services/profit-reporting.service";
import { RevenueModel } from "@/models/revenue.model";
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export const ProfitReportingController = {
  /**
   * @desc    Debug revenue data
   * @route   GET /api/profit-reports/debug-revenue
   * @access  Private/Admin
   */
  debugRevenueData: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      let filter: any = {};
      if (startDate && endDate) {
        filter.date = { 
          $gte: new Date(startDate as string), 
          $lte: new Date(endDate as string) 
        };
      }
      
      // Get all revenues (including blocked ones for debugging)
      const allRevenues = await RevenueModel.find(filter).sort({ date: -1 }).limit(10);
      const activeRevenues = await RevenueModel.find({ ...filter, isBlocked: false }).sort({ date: -1 }).limit(10);
      
      // Get revenue counts
      const totalCount = await RevenueModel.countDocuments(filter);
      const activeCount = await RevenueModel.countDocuments({ ...filter, isBlocked: false });
      const blockedCount = await RevenueModel.countDocuments({ ...filter, isBlocked: true });
      
      // Get date range info
      const earliestRevenue = await RevenueModel.findOne({}).sort({ date: 1 });
      const latestRevenue = await RevenueModel.findOne({}).sort({ date: -1 });
      
      res.status(StatusCodes.OK).json({
        success: true,
        debug: {
          filter,
          counts: {
            total: totalCount,
            active: activeCount,
            blocked: blockedCount
          },
          dateRange: {
            earliest: earliestRevenue?.date,
            latest: latestRevenue?.date,
            searchStart: startDate,
            searchEnd: endDate
          },
          sampleRevenues: {
            all: allRevenues,
            active: activeRevenues
          }
        }
      });
    } catch (error) {
      console.error("Error debugging revenue data:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to debug revenue data"
      });
    }
  },

  /**
   * @desc    Generate profit report for date range
   * @route   POST /api/profit-reports/generate
   * @access  Private/Admin
   */
  generateProfitReport: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Start date and end date are required"
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Start date must be before end date"
        });
      }

      const report = await ProfitReportingService.generateProfitReport(start, end);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Profit report generated successfully",
        data: report
      });
    } catch (error) {
      console.error("Error generating profit report:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to generate profit report"
      });
    }
  },

  /**
   * @desc    Generate time-based expense and revenue report
   * @route   POST /api/profit-reports/time-based
   * @access  Private/Admin
   */
  generateTimeBasedReport: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, period = 'all-time', payrollType } = req.body;

      if (!['all-time', 'daily', 'monthly', 'yearly'].includes(period)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Period must be one of: all-time, daily, monthly, yearly"
        });
      }

      // 🆕 PAYROLL TYPE VALIDATION: Validate payrollType if provided
      if (payrollType && !['ACTUAL', 'GOVERNMENT'].includes(payrollType)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "PayrollType must be either 'ACTUAL' or 'GOVERNMENT'"
        });
      }

      let start: Date | undefined;
      let end: Date | undefined;

      // Only validate dates for daily and monthly periods
      if (period === 'daily' || period === 'monthly') {
        if (!startDate || !endDate) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Start date and end date are required for daily and monthly reports"
          });
        }

        start = new Date(startDate);
        end = new Date(endDate);

        if (start > end) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Start date must be before end date"
          });
        }
      }

      const report = await ProfitReportingService.generateTimeBasedReport(start, end, period, payrollType);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Time-based report generated successfully",
        data: report
      });
    } catch (error) {
      console.error("Error generating time-based report:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to generate time-based report"
      });
    }
  },

  /**
   * @desc    Download profit report as PDF
   * @route   POST /api/profit-reports/download-pdf
   * @access  Private/Admin
   */
  downloadProfitReportPDF: async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, reportType = 'profit', period = 'all-time' } = req.body;

      let start: Date | undefined;
      let end: Date | undefined;
      let report;
      let title;
      
      if (reportType === 'time-based') {
        if (period === 'daily' || period === 'monthly') {
          if (!startDate || !endDate) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "Start date and end date are required for daily and monthly reports"
            });
          }
          start = new Date(startDate);
          end = new Date(endDate);
          title = `Time-Based Financial Report (${start.toDateString()} - ${end.toDateString()})`;
        } else {
          title = `Time-Based Financial Report (${period})`;
        }
        report = await ProfitReportingService.generateTimeBasedReport(start, end, period);
      } else {
        if (!startDate || !endDate) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Start date and end date are required"
          });
        }
        start = new Date(startDate);
        end = new Date(endDate);
        report = await ProfitReportingService.generateProfitReport(start, end);
        title = `Profit Report (${start.toDateString()} - ${end.toDateString()})`;
      }

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
      
      // Pipe PDF to response
      doc.pipe(res);

      // Add content to PDF
      await ProfitReportingController.generatePDFContent(doc, report, title, reportType);

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error("Error generating PDF report:", error);
      
      // If headers haven't been sent, send JSON error response
      if (!res.headersSent) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Failed to generate PDF report"
        });
      }
    }
  },

  /**
   * Generate PDF content for reports
   */
  generatePDFContent: async (doc: PDFKit.PDFDocument, report: any, title: string, reportType: string) => {
    try {
      // Title
      doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown(2);

      // Summary Section
      doc.fontSize(16).font('Helvetica-Bold').text('Financial Summary', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica');
      
      if (reportType === 'time-based') {
        doc.text(`Total Revenue: £${report.summary.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
        doc.text(`Total Expenses: £${report.summary.totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
        doc.text(`Net Profit: £${report.summary.profit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
        doc.text(`Profit Margin: ${report.summary.profitMargin.toFixed(2)}%`);
      } else {
        doc.text(`Total Revenue: £${report.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
        doc.text(`Total Expenses: £${report.totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
        doc.text(`Net Profit: £${report.profit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
        doc.text(`Profit Margin: ${report.profitMargin.toFixed(2)}%`);
      }
      
      doc.moveDown(2);

      // Revenue Breakdown
      if (reportType === 'profit' && report.revenueBreakdown?.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Revenue Breakdown by Source');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        report.revenueBreakdown.forEach((item: any, index: number) => {
          if (index < 10) { // Limit to top 10
            doc.text(`${item.source}: £${item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${item.percentage.toFixed(1)}%)`);
          }
        });
        doc.moveDown(1);
      }

      // Expense Breakdown
      const expenseData = reportType === 'time-based' ? report.topExpenseCategories : report.expenseBreakdown;
      if (expenseData?.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Expense Breakdown by Category');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        expenseData.forEach((item: any, index: number) => {
          if (index < 10) { // Limit to top 10
            const systemTag = item.isSystemGenerated ? ' (System)' : ' (Manual)';
            doc.text(`${item.category}: £${item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} (${item.percentage.toFixed(1)}%)${systemTag}`);
          }
        });
        doc.moveDown(1);
      }

      // Trends Section
      const trendsData = reportType === 'time-based' ? report.trends : report.monthlyTrends;
      if (trendsData?.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('Financial Trends', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        // Create a simple table
        const tableTop = doc.y;
        const itemHeight = 15;
        
        // Headers
        doc.font('Helvetica-Bold');
        doc.text('Period', 50, tableTop);
        doc.text('Revenue', 150, tableTop);
        doc.text('Expenses', 250, tableTop);
        doc.text('Profit', 350, tableTop);
        doc.text('Margin', 450, tableTop);
        
        // Data rows
        doc.font('Helvetica');
        trendsData.forEach((item: any, index: number) => {
          const y = tableTop + (index + 1) * itemHeight;
          const period = reportType === 'time-based' ? item.period : item.month;
          const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0';
          
          doc.text(period, 50, y);
          doc.text(`£${item.revenue.toLocaleString('en-GB')}`, 150, y);
          doc.text(`£${item.expenses.toLocaleString('en-GB')}`, 250, y);
          doc.text(`£${item.profit.toLocaleString('en-GB')}`, 350, y);
          doc.text(`${margin}%`, 450, y);
        });
      }

      // Footer
      doc.fontSize(8).font('Helvetica').text(
        `Generated on ${new Date().toLocaleString('en-GB')} | Bavit Financial Management System`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

    } catch (error) {
      console.error('Error generating PDF content:', error);
      doc.text('Error generating report content. Please try again.');
    }
  }
};
