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
      const { startDate, endDate, period = 'all-time', payrollType } = req.body;

      // 🆕 PAYROLL TYPE VALIDATION: Validate payrollType if provided
      if (payrollType && !['ACTUAL', 'GOVERNMENT'].includes(payrollType)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "PayrollType must be either 'ACTUAL' or 'GOVERNMENT'"
        });
      }

      let start: Date | undefined;
      let end: Date | undefined;
      let report;
      let title;
      
      // Handle different time periods
      if (period === 'daily' || period === 'monthly') {
        if (!startDate || !endDate) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Start date and end date are required for daily and monthly reports"
          });
        }
        start = new Date(startDate);
        end = new Date(endDate);
        title = `Financial Report (${start.toDateString()} - ${end.toDateString()})`;
      } else {
        // For all-time and yearly, no date range needed
        title = `Financial Report (${period})`;
      }

      // Generate the report using time-based service
      report = await ProfitReportingService.generateTimeBasedReport(start, end, period, payrollType);
      
      // Add payroll type to title if specified
      if (payrollType) {
        title += ` - ${payrollType} Payroll`;
      }

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
      
      // Pipe PDF to response
      doc.pipe(res);

      // Add content to PDF
      await ProfitReportingController.generatePDFContent(doc, report, title, 'time-based');

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
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);
      const footerHeight = 30; // Height needed for footer
      
      // Company Header Section
      doc.fontSize(24).font('Helvetica-Bold')
         .fillColor('#1a365d')
         .text('Build My Rig', margin, margin, { align: 'center' });
      
      doc.fontSize(12).font('Helvetica')
         .fillColor('#718096')
         .text('Financial Management System', margin, margin + 35, { align: 'center' });
      
      // Add a horizontal line under header
      doc.strokeColor('#e2e8f0')
         .lineWidth(2)
         .moveTo(margin, margin + 55)
         .lineTo(pageWidth - margin, margin + 55)
         .stroke();
      
      doc.moveDown(3);
      
      // Report Title
      doc.fontSize(20).font('Helvetica-Bold')
         .fillColor('#2d3748')
         .text(title, margin, doc.y, { align: 'center' });
      
      doc.moveDown(1);
      
      // Generated date info
      doc.fontSize(10).font('Helvetica')
         .fillColor('#718096')
         .text(`Generated on ${new Date().toLocaleString('en-GB')}`, margin, doc.y, { align: 'center' });
      
      doc.moveDown(2);

      // Financial Summary Section with Box
      const summaryBoxTop = doc.y;
      doc.rect(margin, summaryBoxTop, contentWidth, 120)
         .fillColor('#f7fafc')
         .fill()
         .stroke();
      
      doc.fontSize(16).font('Helvetica-Bold')
         .fillColor('#2d3748')
         .text('Financial Summary', margin + 20, summaryBoxTop + 15);
      
      doc.fontSize(12).font('Helvetica')
         .fillColor('#4a5568');
      
      const summaryY = summaryBoxTop + 40;
      const col1X = margin + 20;
      const col2X = margin + (contentWidth / 2);
      
      // Determine which data structure to use
      const summaryData = reportType === 'time-based' ? report.summary : report;
      
      // Column 1
      doc.text(`Total Revenue:`, col1X, summaryY);
      doc.font('Helvetica-Bold')
         .fillColor('#38a169')
         .text(`£${summaryData.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, col1X + 100, summaryY);
      
      doc.font('Helvetica')
         .fillColor('#4a5568')
         .text(`Total Expenses:`, col1X, summaryY + 20);
      doc.font('Helvetica-Bold')
         .fillColor('#e53e3e')
         .text(`£${summaryData.totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, col1X + 100, summaryY + 20);
      
      // Column 2
      doc.font('Helvetica')
         .fillColor('#4a5568')
         .text(`Net Profit:`, col2X, summaryY);
      const profitColor = summaryData.profit >= 0 ? '#38a169' : '#e53e3e';
      doc.font('Helvetica-Bold')
         .fillColor(profitColor)
         .text(`£${summaryData.profit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, col2X + 80, summaryY);
      
      doc.font('Helvetica')
         .fillColor('#4a5568')
         .text(`Profit Margin:`, col2X, summaryY + 20);
      doc.font('Helvetica-Bold')
         .fillColor(profitColor)
         .text(`${summaryData.profitMargin.toFixed(2)}%`, col2X + 80, summaryY + 20);
      
      doc.y = summaryBoxTop + 140;
      doc.moveDown(1);

      // Revenue Breakdown Section
      const revenueData = reportType === 'time-based' ? report.topRevenueSources : report.revenueBreakdown;
      if (revenueData?.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#2d3748')
           .text('Revenue Breakdown by Source', margin);
        
        doc.moveDown(0.5);
        
        // Create table for revenue sources
        const revenueTableTop = doc.y;
        const rowHeight = 25;
        const headerHeight = 30;
        
        // Table background
        doc.rect(margin, revenueTableTop, contentWidth, headerHeight + (revenueData.length * rowHeight))
           .fillColor('#ffffff')
           .stroke();
        
        // Header row
        doc.rect(margin, revenueTableTop, contentWidth, headerHeight)
           .fillColor('#edf2f7')
           .fill()
           .stroke();
        
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#2d3748')
           .text('Source', margin + 10, revenueTableTop + 8)
           .text('Amount', margin + 200, revenueTableTop + 8)
           .text('Percentage', margin + 350, revenueTableTop + 8);
        
        // Data rows
        revenueData.forEach((item: any, index: number) => {
          if (index < 8) { // Limit to top 8 for space
            const rowY = revenueTableTop + headerHeight + (index * rowHeight);
            
            // Alternate row colors
            if (index % 2 === 1) {
              doc.rect(margin, rowY, contentWidth, rowHeight)
                 .fillColor('#f7fafc')
                 .fill();
            }
            
            doc.fontSize(10).font('Helvetica')
               .fillColor('#4a5568')
               .text(item.source.length > 30 ? item.source.substring(0, 30) + '...' : item.source, margin + 10, rowY + 8)
               .text(`£${item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, margin + 200, rowY + 8)
               .text(`${item.percentage.toFixed(1)}%`, margin + 350, rowY + 8);
          }
        });
        
        doc.y = revenueTableTop + headerHeight + (Math.min(revenueData.length, 8) * rowHeight) + 20;
      }

      // Expense Breakdown Section
      const expenseData = reportType === 'time-based' ? report.topExpenseCategories : report.expenseBreakdown;
      if (expenseData?.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#2d3748')
           .text('Expense Breakdown by Category', margin);
        
        doc.moveDown(0.5);
        
        // Create table for expense categories
        const expenseTableTop = doc.y;
        const rowHeight = 25;
        const headerHeight = 30;
        
        // Table background
        doc.rect(margin, expenseTableTop, contentWidth, headerHeight + (expenseData.length * rowHeight))
           .fillColor('#ffffff')
           .stroke();
        
        // Header row
        doc.rect(margin, expenseTableTop, contentWidth, headerHeight)
           .fillColor('#edf2f7')
           .fill()
           .stroke();
        
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#2d3748')
           .text('Category', margin + 10, expenseTableTop + 8)
           .text('Amount', margin + 200, expenseTableTop + 8)
           .text('Percentage', margin + 320, expenseTableTop + 8)
           .text('Type', margin + 420, expenseTableTop + 8);
        
        // Data rows
        expenseData.forEach((item: any, index: number) => {
          if (index < 8) { // Limit to top 8 for space
            const rowY = expenseTableTop + headerHeight + (index * rowHeight);
            
            // Alternate row colors
            if (index % 2 === 1) {
              doc.rect(margin, rowY, contentWidth, rowHeight)
                 .fillColor('#f7fafc')
                 .fill();
            }
            
            const systemTag = item.isSystemGenerated ? 'System' : 'Manual';
            const typeColor = item.isSystemGenerated ? '#3182ce' : '#805ad5';
            
            doc.fontSize(10).font('Helvetica')
               .fillColor('#4a5568')
               .text(item.category.length > 25 ? item.category.substring(0, 25) + '...' : item.category, margin + 10, rowY + 8)
               .text(`£${item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, margin + 200, rowY + 8)
               .text(`${item.percentage.toFixed(1)}%`, margin + 320, rowY + 8);
            
            doc.fillColor(typeColor)
               .text(systemTag, margin + 420, rowY + 8);
          }
        });
        
        doc.y = expenseTableTop + headerHeight + (Math.min(expenseData.length, 8) * rowHeight) + 20;
      }

      // Trends Section - calculate required space first
      const trendsData = reportType === 'time-based' ? report.trends : report.monthlyTrends;
      if (trendsData?.length > 0) {
        const rowHeight = 25;
        const headerHeight = 30;
        const trendsToShow = Math.min(trendsData.length, 12); // Reduced for better space management
        const trendsTableHeight = headerHeight + (trendsToShow * rowHeight);
        const trendsHeaderHeight = 50; // Space for "Financial Trends" title and spacing
        const totalTrendsHeight = trendsHeaderHeight + trendsTableHeight;
        
        // Check if we need a new page for trends section
        if (doc.y + totalTrendsHeight + footerHeight + 40 > pageHeight - margin) {
          doc.addPage();
        }
        
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#2d3748')
           .text('Financial Trends', margin);
        
        doc.moveDown(0.5);
        
        // Create professional table for trends
        const trendsTableTop = doc.y;
        
        // Table background
        doc.rect(margin, trendsTableTop, contentWidth, headerHeight + (trendsToShow * rowHeight))
           .fillColor('#ffffff')
           .stroke();
        
        // Header row
        doc.rect(margin, trendsTableTop, contentWidth, headerHeight)
           .fillColor('#2d3748')
           .fill();
        
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#ffffff')
           .text('Period', margin + 10, trendsTableTop + 8)
           .text('Revenue', margin + 120, trendsTableTop + 8)
           .text('Expenses', margin + 220, trendsTableTop + 8)
           .text('Profit', margin + 320, trendsTableTop + 8)
           .text('Margin', margin + 420, trendsTableTop + 8);
        
        // Data rows
        trendsData.slice(0, trendsToShow).forEach((item: any, index: number) => {
          const rowY = trendsTableTop + headerHeight + (index * rowHeight);
          const period = reportType === 'time-based' ? item.period : item.month;
          const profitMarginValue = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0';
          
          // Alternate row colors
          if (index % 2 === 1) {
            doc.rect(margin, rowY, contentWidth, rowHeight)
               .fillColor('#f7fafc')
               .fill();
          }
          
          // Profit color based on value
          const profitColor = item.profit >= 0 ? '#38a169' : '#e53e3e';
          
          doc.fontSize(10).font('Helvetica')
             .fillColor('#4a5568')
             .text(period.length > 15 ? period.substring(0, 15) + '...' : period, margin + 10, rowY + 8)
             .text(`£${item.revenue.toLocaleString('en-GB')}`, margin + 120, rowY + 8)
             .text(`£${item.expenses.toLocaleString('en-GB')}`, margin + 220, rowY + 8);
          
          doc.fillColor(profitColor)
             .text(`£${item.profit.toLocaleString('en-GB')}`, margin + 320, rowY + 8)
             .text(`${profitMarginValue}%`, margin + 420, rowY + 8);
        });
        
        // Update doc.y to after the table
        doc.y = trendsTableTop + headerHeight + (trendsToShow * rowHeight) + 20;
      }

      // Footer - always place on same page as content
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica')
         .fillColor('#718096')
         .text(
           `Generated on ${new Date().toLocaleString('en-GB')} | Build My Rig Financial Management System`,
           margin,
           doc.y,
           { align: 'center', width: contentWidth }
         );

    } catch (error) {
      console.error('Error generating PDF content:', error);
      doc.fontSize(12).font('Helvetica')
         .fillColor('#e53e3e')
         .text('Error generating report content. Please try again.', 50, 150);
    }
  }
};
