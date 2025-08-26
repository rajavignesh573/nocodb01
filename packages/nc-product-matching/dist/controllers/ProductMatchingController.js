"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductMatchingController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const ProductMatchingService_1 = require("~/services/ProductMatchingService");
// Validation schemas
const productQuerySchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    categoryId: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional().transform(val => parseInt(val || '20')),
    offset: zod_1.z.string().optional().transform(val => parseInt(val || '0')),
    sortBy: zod_1.z.enum(['title', 'brand', 'updated_at']).optional().default('title'),
    sortDir: zod_1.z.enum(['asc', 'desc']).optional().default('asc'),
});
const candidateQuerySchema = zod_1.z.object({
    sources: zod_1.z.string().optional().transform(val => val ? val.split(',') : undefined),
    brand: zod_1.z.string().optional(),
    categoryId: zod_1.z.string().optional(),
    priceBandPct: zod_1.z.string().optional().transform(val => val ? parseFloat(val) : 15),
    ruleId: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional().transform(val => parseInt(val || '25')),
});
const matchBodySchema = zod_1.z.object({
    local_product_id: zod_1.z.string().min(1),
    external_product_key: zod_1.z.string().min(1),
    source_code: zod_1.z.string().min(1),
    score: zod_1.z.number().min(0).max(1),
    price_delta_pct: zod_1.z.number(),
    rule_id: zod_1.z.string().min(1),
    status: zod_1.z.enum(['matched', 'not_matched']),
    session_id: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
const matchQuerySchema = zod_1.z.object({
    localProductId: zod_1.z.string().optional(),
    externalProductKey: zod_1.z.string().optional(),
    source: zod_1.z.string().optional(),
    reviewedBy: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional().transform(val => parseInt(val || '50')),
    offset: zod_1.z.string().optional().transform(val => parseInt(val || '0')),
});
let ProductMatchingController = class ProductMatchingController {
    constructor(productMatchingService) {
        this.productMatchingService = productMatchingService;
    }
    async health(res) {
        return res.json({
            status: 'ok',
            version: '1.0.0',
            time: new Date().toISOString(),
        });
    }
    async info(req, res) {
        try {
            // This would return tenant info, available sources, and rules
            return res.json({
                tenant_id: req.context.workspace_id,
                sources: [],
                rules: [],
            });
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get info', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getProducts(req, res, query) {
        try {
            const parseResult = productQuerySchema.safeParse(query);
            if (!parseResult.success) {
                throw new common_1.HttpException('Invalid query parameters: ' + parseResult.error.message, common_1.HttpStatus.BAD_REQUEST);
            }
            const filter = parseResult.data;
            const result = await this.productMatchingService.getProducts(req.context, filter);
            return res.json(result);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get products', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCandidates(req, res, productId, query) {
        try {
            const parseResult = candidateQuerySchema.safeParse(query);
            if (!parseResult.success) {
                throw new common_1.HttpException('Invalid query parameters: ' + parseResult.error.message, common_1.HttpStatus.BAD_REQUEST);
            }
            // Get the local product
            const localProduct = await this.productMatchingService.getProductById(req.context, productId);
            if (!localProduct) {
                throw new common_1.HttpException('Product not found', common_1.HttpStatus.NOT_FOUND);
            }
            const filter = parseResult.data;
            const result = await this.productMatchingService.getExternalCandidates(req.context, localProduct, filter);
            return res.json(result);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get candidates', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async confirmMatch(req, res, body) {
        try {
            const parseResult = matchBodySchema.safeParse(body);
            if (!parseResult.success) {
                throw new common_1.HttpException('Invalid request body: ' + parseResult.error.message, common_1.HttpStatus.BAD_REQUEST);
            }
            const matchData = parseResult.data;
            const userId = req.context.user?.id;
            if (!userId) {
                throw new common_1.HttpException('User not authenticated', common_1.HttpStatus.UNAUTHORIZED);
            }
            const result = await this.productMatchingService.confirmMatch(req.context, matchData, userId);
            return res.json(result);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to confirm match', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteMatch(req, res, matchId) {
        try {
            await this.productMatchingService.deleteMatch(req.context, matchId);
            return res.status(common_1.HttpStatus.NO_CONTENT).send();
        }
        catch (error) {
            throw new common_1.HttpException('Failed to delete match', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getMatches(req, res, query) {
        try {
            const parseResult = matchQuerySchema.safeParse(query);
            if (!parseResult.success) {
                throw new common_1.HttpException('Invalid query parameters: ' + parseResult.error.message, common_1.HttpStatus.BAD_REQUEST);
            }
            const filters = parseResult.data;
            const result = await this.productMatchingService.getMatches(req.context, filters, filters.limit, filters.offset);
            return res.json(result);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get matches', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ProductMatchingController = ProductMatchingController;
__decorate([
    (0, common_1.Get)('/api/v1/db/data/v1/:projectId/:tableName/product-matching/health'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductMatchingController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('/api/v1/db/data/v1/:projectId/:tableName/product-matching/info'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProductMatchingController.prototype, "info", null);
__decorate([
    (0, common_1.Get)('/api/v1/db/data/v1/:projectId/:tableName/product-matching/products'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductMatchingController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('/api/v1/db/data/v1/:projectId/:tableName/product-matching/products/:productId/candidates'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('productId')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProductMatchingController.prototype, "getCandidates", null);
__decorate([
    (0, common_1.Post)('/api/v1/db/data/v1/:projectId/:tableName/product-matching/matches'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductMatchingController.prototype, "confirmMatch", null);
__decorate([
    (0, common_1.Delete)('/api/v1/db/data/v1/:projectId/:tableName/product-matching/matches/:matchId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('matchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ProductMatchingController.prototype, "deleteMatch", null);
__decorate([
    (0, common_1.Get)('/api/v1/db/data/v1/:projectId/:tableName/product-matching/matches'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductMatchingController.prototype, "getMatches", null);
exports.ProductMatchingController = ProductMatchingController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [ProductMatchingService_1.ProductMatchingService])
], ProductMatchingController);
//# sourceMappingURL=ProductMatchingController.js.map