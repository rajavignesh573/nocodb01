import type { NcContext } from '../interface/config';
export interface ProductMatchSourceType {
    id?: string;
    name?: string;
    code?: string;
    base_config?: string;
    is_active?: boolean;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
}
export default class ProductMatchSource implements ProductMatchSourceType {
    id?: string;
    name?: string;
    code?: string;
    base_config?: string;
    is_active?: boolean;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
    constructor(source: Partial<ProductMatchSourceType>);
    static castType(source: ProductMatchSource): ProductMatchSource;
    static insert(context: NcContext, source: Partial<ProductMatchSourceType>, ncMeta: any): Promise<ProductMatchSource>;
    static update(context: NcContext, sourceId: string, source: Partial<ProductMatchSourceType>, ncMeta: any): Promise<ProductMatchSource>;
    static get(context: NcContext, sourceId: string, ncMeta: any): Promise<ProductMatchSource>;
    static list(context: NcContext, limit: number | undefined, offset: number | undefined, ncMeta: any): Promise<any>;
    static delete(context: NcContext, sourceId: string, ncMeta: any): Promise<void>;
    static getByCode(context: NcContext, code: string, ncMeta: any): Promise<ProductMatchSource | null>;
}
//# sourceMappingURL=ProductMatchSource.d.ts.map