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

      // Helper function to create tables with proper page breaks
      const createTableWithPageBreaks = (data: any[], columns: any[], title: string, maxRowsPerPage: number = 8) => {
        if (!data || data.length === 0) return;
        
        const rowHeight = 25;
        const headerHeight = 30;
        const titleHeight = 40; // Space for title and spacing
        
        // Add title
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#2d3748')
           .text(title, margin);
        
        doc.moveDown(0.5);
        
        // Split data into pages
        const totalPages = Math.ceil(data.length / maxRowsPerPage);
        
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
          const startIndex = pageIndex * maxRowsPerPage;
          const endIndex = Math.min(startIndex + maxRowsPerPage, data.length);
          const pageData = data.slice(startIndex, endIndex);
          const rowsOnThisPage = pageData.length;
          
          // Check if we need a new page (except for first page)
          if (pageIndex > 0) {
            doc.addPage();
          }
          
          // Calculate required height for this page's table
          const tableHeight = headerHeight + (rowsOnThisPage * rowHeight);
          const totalRequiredHeight = tableHeight + footerHeight + 40;
          
          // Check if we have enough space on current page
          if (doc.y + totalRequiredHeight > pageHeight - margin) {
            doc.addPage();
          }
          
          const tableTop = doc.y;
          
          // Table background
          doc.rect(margin, tableTop, contentWidth, tableHeight)
             .fillColor('#ffffff')
             .stroke();
          
          // Header row
          doc.rect(margin, tableTop, contentWidth, headerHeight)
             .fillColor('#edf2f7')
             .fill()
             .stroke();
          
          // Draw header text
          doc.fontSize(12).font('Helvetica-Bold')
             .fillColor('#2d3748');
          
          columns.forEach((column, colIndex) => {
            doc.text(column.header, column.x, tableTop + 8);
          });
          
          // Data rows
          pageData.forEach((item: any, index: number) => {
            const rowY = tableTop + headerHeight + (index * rowHeight);
            
            // Alternate row colors
            if (index % 2 === 1) {
              doc.rect(margin, rowY, contentWidth, rowHeight)
                 .fillColor('#f7fafc')
                 .fill();
            }
            
            // Draw row data
            doc.fontSize(10).font('Helvetica')
               .fillColor('#4a5568');
            
            columns.forEach((column, colIndex) => {
              const value = column.getValue(item);
              const color = column.getColor ? column.getColor(item) : '#4a5568';
              
              doc.fillColor(color)
                 .text(value, column.x, rowY + 8);
            });
          });
          
          // Update doc.y to after the table
          doc.y = tableTop + tableHeight + 20;
        }
      };

      // Revenue Breakdown Section
      const revenueData = reportType === 'time-based' ? report.topRevenueSources : report.revenueBreakdown;
      if (revenueData?.length > 0) {
        const revenueColumns = [
          {
            header: 'Source',
            x: margin + 10,
            getValue: (item: any) => item.source.length > 30 ? item.source.substring(0, 30) + '...' : item.source
          },
          {
            header: 'Amount',
            x: margin + 200,
            getValue: (item: any) => `£${item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
          },
          {
            header: 'Percentage',
            x: margin + 350,
            getValue: (item: any) => `${item.percentage.toFixed(1)}%`
          }
        ];
        
        createTableWithPageBreaks(revenueData, revenueColumns, 'Revenue Breakdown by Source');
      }

      // Expense Breakdown Section
      const expenseData = reportType === 'time-based' ? report.topExpenseCategories : report.expenseBreakdown;
      if (expenseData?.length > 0) {
        const expenseColumns = [
          {
            header: 'Category',
            x: margin + 10,
            getValue: (item: any) => item.category.length > 25 ? item.category.substring(0, 25) + '...' : item.category
          },
          {
            header: 'Amount',
            x: margin + 200,
            getValue: (item: any) => `£${item.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
          },
          {
            header: 'Percentage',
            x: margin + 320,
            getValue: (item: any) => `${item.percentage.toFixed(1)}%`
          },
          {
            header: 'Type',
            x: margin + 420,
            getValue: (item: any) => item.isSystemGenerated ? 'System' : 'Manual',
            getColor: (item: any) => item.isSystemGenerated ? '#3182ce' : '#805ad5'
          }
        ];
        
        createTableWithPageBreaks(expenseData, expenseColumns, 'Expense Breakdown by Category');
      }

      // Trends Section
      const trendsData = reportType === 'time-based' ? report.trends : report.monthlyTrends;
      if (trendsData?.length > 0) {
        const trendsToShow = Math.min(trendsData.length, 12);
        const trendsColumns = [
          {
            header: 'Period',
            x: margin + 10,
            getValue: (item: any) => {
              const period = reportType === 'time-based' ? item.period : item.month;
              return period.length > 15 ? period.substring(0, 15) + '...' : period;
            }
          },
          {
            header: 'Revenue',
            x: margin + 120,
            getValue: (item: any) => `£${item.revenue.toLocaleString('en-GB')}`
          },
          {
            header: 'Expenses',
            x: margin + 220,
            getValue: (item: any) => `£${item.expenses.toLocaleString('en-GB')}`
          },
          {
            header: 'Profit',
            x: margin + 320,
            getValue: (item: any) => `£${item.profit.toLocaleString('en-GB')}`,
            getColor: (item: any) => item.profit >= 0 ? '#38a169' : '#e53e3e'
          },
          {
            header: 'Margin',
            x: margin + 420,
            getValue: (item: any) => {
              const profitMarginValue = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0';
              return `${profitMarginValue}%`;
            },
            getColor: (item: any) => item.profit >= 0 ? '#38a169' : '#e53e3e'
          }
        ];
        
        createTableWithPageBreaks(trendsData.slice(0, trendsToShow), trendsColumns, 'Financial Trends');
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
