import type { NcContext } from '../interface/config';
export interface Product {
    id: string;
    title: string;
    brand?: string;
    category_id?: string;
    price?: number;
    gtin?: string;
    media?: Array<{
        url: string;
    }>;
}
export interface ExternalProduct {
    external_product_key: string;
    source: {
        id: string;
        code: string;
        name: string;
    };
    title: string;
    brand?: string;
    price?: number;
    image?: string;
    gtin?: string;
    score: number;
    explanations: {
        name: number;
        brand: number;
        category: number;
        price: number;
        gtin?: number;
    };
}
export interface CandidateFilter {
    sources?: string[];
    brand?: string;
    categoryId?: string;
    priceBandPct?: number;
    ruleId?: string;
    limit?: number;
}
export interface ProductFilter {
    q?: string;
    categoryId?: string;
    brand?: string;
    status?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'title' | 'brand' | 'updated_at';
    sortDir?: 'asc' | 'desc';
}
export declare class ProductMatchingService {
    private readonly ncMeta;
    constructor(ncMeta: any);
    getProducts(context: NcContext, filter: ProductFilter): Promise<{
        items: Product[];
        page: number;
        total: number;
    }>;
    getProductById(context: NcContext, productId: string): Promise<Product | null>;
    getExternalCandidates(context: NcContext, localProduct: Product, filter: CandidateFilter): Promise<{
        items: ExternalProduct[];
        generated_at: string;
    }>;
    private findCandidatesForSource;
    private calculateSimilarityScore;
    private calculateNameSimilarity;
    private calculateBrandSimilarity;
    private calculatePriceSimilarity;
    confirmMatch(context: NcContext, matchData: {
        local_product_id: string;
        external_product_key: string;
        source_code: string;
        score: number;
        price_delta_pct: number;
        rule_id: string;
        status: 'matched' | 'not_matched';
        session_id?: string;
        notes?: string;
    }, userId: string): Promise<{
        match_id: string;
    }>;
    getMatches(context: NcContext, filters?: {
        localProductId?: string;
        externalProductKey?: string;
        source?: string;
        reviewedBy?: string;
        status?: string;
    }, limit?: number, offset?: number): Promise<{
        items: any[];
        page: number;
        total: number;
    }>;
    deleteMatch(context: NcContext, matchId: string): Promise<void>;
}
//# sourceMappingURL=ProductMatchingService.d.ts.map