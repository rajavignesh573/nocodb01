import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExecutionResult } from './query-executor.service';

export interface FormattedResponse {
  format: 'table' | 'json' | 'chart';
  content: string;
  metadata?: {
    rowCount?: number;
    columnCount?: number;
    executionTime?: number;
  };
}

@Injectable()
export class ResponseFormatterService {
  private readonly logger = new Logger(ResponseFormatterService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Format execution result into requested format
   */
  async formatResponse(
    result: ExecutionResult,
    requestedFormat: 'table' | 'json' | 'chart' = 'table',
  ): Promise<FormattedResponse> {
    this.logger.log(`Formatting response as ${requestedFormat}`);

    if (!result.success) {
      return {
        format: requestedFormat,
        content: `Error: ${result.error}`,
        metadata: {
          executionTime: result.metadata?.executionTime,
        },
      };
    }

    try {
      switch (requestedFormat) {
        case 'table':
          return this.formatAsTable(result);
        case 'json':
          return this.formatAsJson(result);
        case 'chart':
          return this.formatAsChart(result);
        default:
          return this.formatAsTable(result);
      }
    } catch (error) {
      this.logger.error('Error formatting response:', error);
      return {
        format: requestedFormat,
        content: `Error formatting response: ${error.message}`,
        metadata: {
          executionTime: result.metadata?.executionTime,
        },
      };
    }
  }

  /**
   * Format data as a markdown table
   */
  private formatAsTable(result: ExecutionResult): FormattedResponse {
    const data = result.data as Array<Record<string, unknown>>;
    
    if (!Array.isArray(data) || data.length === 0) {
      return {
        format: 'table',
        content: 'No data available',
        metadata: {
          rowCount: 0,
          columnCount: 0,
          executionTime: result.metadata?.executionTime,
        },
      };
    }

    // Get column headers from first row
    const headers = Object.keys(data[0]);
    const columnCount = headers.length;

    // Build table header
    let tableContent = `| ${headers.join(' | ')} |\n`;
    tableContent += `| ${headers.map(() => '---').join(' | ')} |\n`;

    // Build table rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return value !== null && value !== undefined ? String(value) : '';
      });
      tableContent += `| ${values.join(' | ')} |\n`;
    }

    return {
      format: 'table',
      content: tableContent,
      metadata: {
        rowCount: data.length,
        columnCount,
        executionTime: result.metadata?.executionTime,
      },
    };
  }

  /**
   * Format data as JSON
   */
  private formatAsJson(result: ExecutionResult): FormattedResponse {
    const data = result.data;
    
    const jsonContent = JSON.stringify(data, null, 2);
    
    return {
      format: 'json',
      content: jsonContent,
      metadata: {
        rowCount: Array.isArray(data) ? data.length : 1,
        executionTime: result.metadata?.executionTime,
      },
    };
  }

  /**
   * Format data as a chart (simple text-based visualization)
   */
  private formatAsChart(result: ExecutionResult): FormattedResponse {
    const data = result.data as Array<Record<string, unknown>>;
    
    if (!Array.isArray(data) || data.length === 0) {
      return {
        format: 'chart',
        content: 'No data available for chart',
        metadata: {
          rowCount: 0,
          executionTime: result.metadata?.executionTime,
        },
      };
    }

    // Find numeric columns for charting
    const numericColumns = this.findNumericColumns(data);
    
    if (numericColumns.length === 0) {
      return {
        format: 'chart',
        content: 'No numeric data available for charting',
        metadata: {
          rowCount: data.length,
          executionTime: result.metadata?.executionTime,
        },
      };
    }

    // Create simple bar chart for first numeric column
    const chartColumn = numericColumns[0];
    const chartData = data.slice(0, 10); // Limit to first 10 rows for readability
    
    let chartContent = `Simple Bar Chart: ${chartColumn}\n`;
    chartContent += `${'='.repeat(50)}\n\n`;

    for (const row of chartData) {
      const value = Number(row[chartColumn]) || 0;
      const label = this.getRowLabel(row, chartColumn);
      const barLength = Math.min(Math.floor(value / 10), 40); // Scale bar length
      const bar = '█'.repeat(barLength);
      
      chartContent += `${label.padEnd(20)} | ${bar} ${value}\n`;
    }

    return {
      format: 'chart',
      content: chartContent,
      metadata: {
        rowCount: data.length,
        columnCount: Object.keys(data[0] || {}).length,
        executionTime: result.metadata?.executionTime,
      },
    };
  }

  /**
   * Find numeric columns in the data
   */
  private findNumericColumns(data: Array<Record<string, unknown>>): string[] {
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]);
    const numericColumns: string[] = [];

    for (const column of columns) {
      const hasNumericValues = data.some(row => {
        const value = row[column];
        return typeof value === 'number' || 
               (typeof value === 'string' && !Number.isNaN(Number(value)));
      });

      if (hasNumericValues) {
        numericColumns.push(column);
      }
    }

    return numericColumns;
  }

  /**
   * Get a label for a row in the chart
   */
  private getRowLabel(row: Record<string, unknown>, excludeColumn: string): string {
    const otherColumns = Object.keys(row).filter(col => col !== excludeColumn);
    
    if (otherColumns.length > 0) {
      const label = String(row[otherColumns[0]] || 'Unknown');
      return label.length > 18 ? `${label.substring(0, 15)}...` : label;
    }
    
    return 'Row';
  }

  /**
   * Format error response
   */
  formatError(error: string, executionTime?: number): FormattedResponse {
    return {
      format: 'table',
      content: `❌ Error: ${error}`,
      metadata: {
        executionTime,
      },
    };
  }

  /**
   * Format success message with metadata
   */
  formatSuccess(
    message: string,
    metadata?: {
      rowCount?: number;
      columnCount?: number;
      executionTime?: number;
    },
  ): FormattedResponse {
    let content = `✅ ${message}`;
    
    if (metadata) {
      const details: string[] = [];
      if (metadata.rowCount !== undefined) {
        details.push(`${metadata.rowCount} rows`);
      }
      if (metadata.columnCount !== undefined) {
        details.push(`${metadata.columnCount} columns`);
      }
      if (metadata.executionTime !== undefined) {
        details.push(`${metadata.executionTime}ms`);
      }
      
      if (details.length > 0) {
        content += ` (${details.join(', ')})`;
      }
    }

    return {
      format: 'table',
      content,
      metadata,
    };
  }
}
