import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { z } from 'zod';
import { ProductMatchingService } from '~/services/ProductMatchingService';
import type { NcContext } from '~/interface/config';

// Validation schemas
const productQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional().transform(val => parseInt(val || '20')),
  offset: z.string().optional().transform(val => parseInt(val || '0')),
  sortBy: z.enum(['title', 'brand', 'updated_at']).optional().default('title'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

const candidateQuerySchema = z.object({
  sources: z.string().optional().transform(val => val ? val.split(',') : undefined),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  priceBandPct: z.string().optional().transform(val => val ? parseFloat(val) : 15),
  ruleId: z.string().optional(),
  limit: z.string().optional().transform(val => parseInt(val || '25')),
});

const matchBodySchema = z.object({
  local_product_id: z.string().min(1),
  external_product_key: z.string().min(1),
  source_code: z.string().min(1),
  score: z.number().min(0).max(1),
  price_delta_pct: z.number(),
  rule_id: z.string().min(1),
  status: z.enum(['matched', 'not_matched']),
  session_id: z.string().optional(),
  notes: z.string().optional(),
});

const matchQuerySchema = z.object({
  localProductId: z.string().optional(),
  externalProductKey: z.string().optional(),
  source: z.string().optional(),
  reviewedBy: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional().transform(val => parseInt(val || '50')),
  offset: z.string().optional().transform(val => parseInt(val || '0')),
});

@Controller()
export class ProductMatchingController {
  constructor(
    private readonly productMatchingService: ProductMatchingService,
  ) {}

  @Get('/api/v1/db/data/v1/:projectId/:tableName/product-matching/health')
  async health(@Res() res: Response) {
    return res.json({
      status: 'ok',
      version: '1.0.0',
      time: new Date().toISOString(),
    });
  }

  @Get('/api/v1/db/data/v1/:projectId/:tableName/product-matching/info')
  async info(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
  ) {
    try {
      // This would return tenant info, available sources, and rules
      return res.json({
        tenant_id: req.context.workspace_id,
        sources: [],
        rules: [],
      });
    } catch (error) {
      throw new HttpException(
        'Failed to get info',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/api/v1/db/data/v1/:projectId/:tableName/product-matching/products')
  async getProducts(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
    @Query() query: any,
  ) {
    try {
      const parseResult = productQuerySchema.safeParse(query);
      if (!parseResult.success) {
        throw new HttpException(
          'Invalid query parameters: ' + parseResult.error.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      const filter = parseResult.data;
      const result = await this.productMatchingService.getProducts(
        req.context,
        filter,
      );

      return res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/api/v1/db/data/v1/:projectId/:tableName/product-matching/products/:productId/candidates')
  async getCandidates(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
    @Param('productId') productId: string,
    @Query() query: any,
  ) {
    try {
      const parseResult = candidateQuerySchema.safeParse(query);
      if (!parseResult.success) {
        throw new HttpException(
          'Invalid query parameters: ' + parseResult.error.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get the local product
      const localProduct = await this.productMatchingService.getProductById(
        req.context,
        productId,
      );

      if (!localProduct) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      const filter = parseResult.data;
      const result = await this.productMatchingService.getExternalCandidates(
        req.context,
        localProduct,
        filter,
      );

      return res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get candidates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/api/v1/db/data/v1/:projectId/:tableName/product-matching/matches')
  async confirmMatch(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
    @Body() body: any,
  ) {
    try {
      const parseResult = matchBodySchema.safeParse(body);
      if (!parseResult.success) {
        throw new HttpException(
          'Invalid request body: ' + parseResult.error.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      const matchData = parseResult.data;
      const userId = req.context.user?.id;

      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const result = await this.productMatchingService.confirmMatch(
        req.context,
        matchData,
        userId,
      );

      return res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to confirm match',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('/api/v1/db/data/v1/:projectId/:tableName/product-matching/matches/:matchId')
  async deleteMatch(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
    @Param('matchId') matchId: string,
  ) {
    try {
      await this.productMatchingService.deleteMatch(req.context, matchId);
      return res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      throw new HttpException(
        'Failed to delete match',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/api/v1/db/data/v1/:projectId/:tableName/product-matching/matches')
  async getMatches(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
    @Query() query: any,
  ) {
    try {
      const parseResult = matchQuerySchema.safeParse(query);
      if (!parseResult.success) {
        throw new HttpException(
          'Invalid query parameters: ' + parseResult.error.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      const filters = parseResult.data;
      const result = await this.productMatchingService.getMatches(
        req.context,
        filters,
        filters.limit,
        filters.offset,
      );

      return res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get matches',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
