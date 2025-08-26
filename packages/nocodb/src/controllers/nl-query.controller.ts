import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { GlobalGuard } from '~/guards/global/global.guard';
import { NcError } from '~/helpers/catchError';
import { NcContext } from '~/interface/config';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import { NlOrchestratorService } from '~/services/nl-orchestrator.service';

// Validation schemas
const nlQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  format: z.enum(['table', 'json', 'chart']).optional().default('table'),
});

const schemaInfoSchema = z.object({
  refresh: z.string().optional().transform(val => val === 'true'),
});

@Controller()
export class NlQueryController {
  constructor(
    private readonly nlOrchestratorService: NlOrchestratorService,
    private readonly configService: ConfigService,
  ) {}

  @Post('/api/v1/db/data/v1/noco/default/nl-query')
  @UseGuards(GlobalGuard)
  async processQuery(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
    @Body() body: unknown,
  ) {
    try {
      // Validate request body
      const parseResult = nlQuerySchema.safeParse(body);
      if (!parseResult.success) {
        throw new HttpException(`Invalid request body: ${parseResult.error.message}`, HttpStatus.BAD_REQUEST);
      }

      const { query, format } = parseResult.data;
      const context = req.context;

      console.log('NL Query request:', { query, format, userId: context.user?.id });

      // Process the natural language query
      const result = await this.nlOrchestratorService.processQuery(context, query, format);

      if (result.success) {
        return res.status(HttpStatus.OK).json({
          success: true,
          content: result.content,
          format: result.format,
          metadata: result.metadata,
        });
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: result.error,
          content: result.content,
          format: result.format,
          metadata: result.metadata,
        });
      }
    } catch (error) {
      console.error('NL Query Error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }

  @Get('/api/v1/db/data/v1/noco/default/nl-query/schema')
  @UseGuards(GlobalGuard)
  async getSchemaInfo(
    @Req() req: Request & { context: NcContext },
    @Query() query: unknown,
  ) {
    try {
      // Validate query parameters
      const parseResult = schemaInfoSchema.safeParse(query);
      if (!parseResult.success) {
        throw new HttpException('Invalid query parameters: ' + parseResult.error.message, HttpStatus.BAD_REQUEST);
      }

      const { refresh } = parseResult.data;
      const context = req.context;

      console.log('Schema info request:', { refresh, userId: context.user?.id });

      let result;
      if (refresh) {
        result = await this.nlOrchestratorService.refreshSchemaCatalog(context);
      } else {
        result = await this.nlOrchestratorService.getSchemaInfo(context);
      }

      if (result.success) {
        return {
          success: true,
          content: result.content,
          format: result.format,
          metadata: result.metadata,
        };
      } else {
        throw new HttpException(result.error || 'Failed to get schema info', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      console.error('Schema Info Error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/api/v1/db/data/v1/noco/default/nl-query/resolve')
  @UseGuards(GlobalGuard)
  async resolveAmbiguousEntity(
    @Req() req: Request & { context: NcContext },
    @Body() body: unknown,
  ) {
    try {
      const resolveSchema = z.object({
        entityType: z.enum(['table', 'view', 'base']),
        entityName: z.string().min(1, 'Entity name cannot be empty'),
      });

      const parseResult = resolveSchema.safeParse(body);
      if (!parseResult.success) {
        throw new HttpException('Invalid request body: ' + parseResult.error.message, HttpStatus.BAD_REQUEST);
      }

      const { entityType, entityName } = parseResult.data;
      const context = req.context;

      console.log('Resolve entity request:', { entityType, entityName, userId: context.user?.id });

      const result = await this.nlOrchestratorService.handleAmbiguousEntity(context, entityType, entityName);

      if (result.success) {
        return {
          success: true,
          content: result.content,
          format: result.format,
          metadata: result.metadata,
        };
      } else {
        return {
          success: false,
          error: result.error,
          content: result.content,
          format: result.format,
          metadata: result.metadata,
        };
      }
    } catch (error) {
      console.error('Resolve Entity Error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/api/v1/db/data/v1/noco/default/nl-query/refresh-schema')
  @UseGuards(GlobalGuard)
  async refreshSchema(
    @Req() req: Request & { context: NcContext },
  ) {
    try {
      const context = req.context;
      console.log('Refresh schema request from user:', context.user?.id);

      const result = await this.nlOrchestratorService.refreshSchemaCatalog(context);

      if (result.success) {
        return {
          success: true,
          content: result.content,
          format: result.format,
          metadata: result.metadata,
        };
      } else {
        throw new HttpException(result.error || 'Failed to refresh schema', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      console.error('Refresh Schema Error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
