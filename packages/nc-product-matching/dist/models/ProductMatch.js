"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extractProps_1 = require("../helpers/extractProps");
const uuid_1 = require("uuid");
class ProductMatch {
    constructor(match) {
        Object.assign(this, match);
    }
    static castType(match) {
        return match && new ProductMatch(match);
    }
    static async insert(context, match, ncMeta) {
        const insertObj = (0, extractProps_1.extractProps)(match, [
            'id',
            'tenant_id',
            'local_product_id',
            'external_product_key',
            'source_id',
            'score',
            'price_delta_pct',
            'rule_id',
            'session_id',
            'status',
            'reviewed_by',
            'reviewed_at',
            'notes',
            'version',
            'created_at',
            'created_by',
            'updated_at',
            'updated_by',
        ]);
        if (!insertObj.id) {
            insertObj.id = (0, uuid_1.v4)();
        }
        if (!insertObj.created_at) {
            insertObj.created_at = new Date().toISOString();
        }
        if (!insertObj.updated_at) {
            insertObj.updated_at = new Date().toISOString();
        }
        if (!insertObj.version) {
            insertObj.version = 1;
        }
        const { id } = await ncMeta.metaInsert2(context.workspace_id, context.base_id, 'nc_product_matches', insertObj);
        return ProductMatch.get(context, id, ncMeta);
    }
    static async update(context, matchId, match, ncMeta) {
        const updateObj = (0, extractProps_1.extractProps)(match, [
            'score',
            'price_delta_pct',
            'rule_id',
            'session_id',
            'status',
            'reviewed_by',
            'reviewed_at',
            'notes',
            'version',
            'updated_at',
            'updated_by',
        ]);
        updateObj.updated_at = new Date().toISOString();
        await ncMeta.metaUpdate(context.workspace_id, context.base_id, 'nc_product_matches', updateObj, matchId);
        return ProductMatch.get(context, matchId, ncMeta);
    }
    static async get(context, matchId, ncMeta) {
        const match = await ncMeta.metaGet2(context.workspace_id, context.base_id, 'nc_product_matches', matchId);
        return ProductMatch.castType(match);
    }
    static async list(context, filters = {}, limit = 50, offset = 0, ncMeta) {
        const condition = {};
        if (filters.localProductId)
            condition.local_product_id = filters.localProductId;
        if (filters.externalProductKey)
            condition.external_product_key = filters.externalProductKey;
        if (filters.sourceId)
            condition.source_id = filters.sourceId;
        if (filters.reviewedBy)
            condition.reviewed_by = filters.reviewedBy;
        if (filters.status)
            condition.status = filters.status;
        if (filters.tenantId)
            condition.tenant_id = filters.tenantId;
        const matches = await ncMeta.metaList2(context.workspace_id, context.base_id, 'nc_product_matches', {
            condition,
            orderBy: { created_at: 'desc' },
            limit,
            offset,
        });
        return matches.map((match) => ProductMatch.castType(match));
    }
    static async delete(context, matchId, ncMeta) {
        // Soft delete by marking as superseded
        await ProductMatch.update(context, matchId, { status: 'superseded' }, ncMeta);
    }
    static async getByLocalProduct(context, localProductId, tenantId, ncMeta) {
        const matches = await ncMeta.metaList2(context.workspace_id, context.base_id, 'nc_product_matches', {
            condition: {
                local_product_id: localProductId,
                tenant_id: tenantId,
                status: 'matched'
            },
            orderBy: { score: 'desc' },
        });
        return matches.map((match) => ProductMatch.castType(match));
    }
}
exports.default = ProductMatch;
//# sourceMappingURL=ProductMatch.js.map