import type { NcContext } from '../interface/config';
export interface ProductMatchType {
    id?: string;
    tenant_id?: string;
    local_product_id?: string;
    external_product_key?: string;
    source_id?: string;
    score?: number;
    price_delta_pct?: number;
    rule_id?: string;
    session_id?: string;
    status?: 'matched' | 'not_matched' | 'superseded';
    reviewed_by?: string;
    reviewed_at?: string;
    notes?: string;
    version?: number;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}
export default class ProductMatch implements ProductMatchType {
    id?: string;
    tenant_id?: string;
    local_product_id?: string;
    external_product_key?: string;
    source_id?: string;
    score?: number;
    price_delta_pct?: number;
    rule_id?: string;
    session_id?: string;
    status?: 'matched' | 'not_matched' | 'superseded';
    reviewed_by?: string;
    reviewed_at?: string;
    notes?: string;
    version?: number;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
    constructor(match: Partial<ProductMatchType>);
    static castType(match: ProductMatch): ProductMatch;
    static insert(context: NcContext, match: Partial<ProductMatchType>, ncMeta: any): Promise<ProductMatch>;
    static update(context: NcContext, matchId: string, match: Partial<ProductMatchType>, ncMeta: any): Promise<ProductMatch>;
    static get(context: NcContext, matchId: string, ncMeta: any): Promise<ProductMatch>;
    static list(context: NcContext, filters: {
        localProductId?: string;
        externalProductKey?: string;
        sourceId?: string;
        reviewedBy?: string;
        status?: string;
        tenantId?: string;
    } | undefined, limit: number | undefined, offset: number | undefined, ncMeta: any): Promise<any>;
    static delete(context: NcContext, matchId: string, ncMeta: any): Promise<void>;
    static getByLocalProduct(context: NcContext, localProductId: string, tenantId: string, ncMeta: any): Promise<any>;
}
//# sourceMappingURL=ProductMatch.d.ts.map