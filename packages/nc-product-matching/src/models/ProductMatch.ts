import type { NcContext } from '../interface/config';
import { extractProps } from '../helpers/extractProps';
import { v4 as uuidv4 } from 'uuid';

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

  constructor(match: Partial<ProductMatchType>) {
    Object.assign(this, match);
  }

  public static castType(match: ProductMatch): ProductMatch {
    return match && new ProductMatch(match);
  }

  public static async insert(
    context: NcContext,
    match: Partial<ProductMatchType>,
    ncMeta: any,
  ) {
    const insertObj = extractProps(match, [
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
      insertObj.id = uuidv4();
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

    const { id } = await ncMeta.metaInsert2(
      context.workspace_id,
      context.base_id,
      'nc_product_matches',
      insertObj,
    );

    return ProductMatch.get(context, id, ncMeta);
  }

  public static async update(
    context: NcContext,
    matchId: string,
    match: Partial<ProductMatchType>,
    ncMeta: any,
  ) {
    const updateObj = extractProps(match, [
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

    await ncMeta.metaUpdate(
      context.workspace_id,
      context.base_id,
      'nc_product_matches',
      updateObj,
      matchId,
    );

    return ProductMatch.get(context, matchId, ncMeta);
  }

  public static async get(
    context: NcContext,
    matchId: string,
    ncMeta: any,
  ) {
    const match = await ncMeta.metaGet2(
      context.workspace_id,
      context.base_id,
      'nc_product_matches',
      matchId,
    );

    return ProductMatch.castType(match);
  }

  public static async list(
    context: NcContext,
    filters: {
      localProductId?: string;
      externalProductKey?: string;
      sourceId?: string;
      reviewedBy?: string;
      status?: string;
      tenantId?: string;
    } = {},
    limit = 50,
    offset = 0,
    ncMeta: any,
  ) {
    const condition: any = {};
    
    if (filters.localProductId) condition.local_product_id = filters.localProductId;
    if (filters.externalProductKey) condition.external_product_key = filters.externalProductKey;
    if (filters.sourceId) condition.source_id = filters.sourceId;
    if (filters.reviewedBy) condition.reviewed_by = filters.reviewedBy;
    if (filters.status) condition.status = filters.status;
    if (filters.tenantId) condition.tenant_id = filters.tenantId;

    const matches = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      'nc_product_matches',
      {
        condition,
        orderBy: { created_at: 'desc' },
        limit,
        offset,
      },
    );

    return matches.map((match: any) => ProductMatch.castType(match));
  }

  public static async delete(
    context: NcContext,
    matchId: string,
    ncMeta: any,
  ) {
    // Soft delete by marking as superseded
    await ProductMatch.update(
      context,
      matchId,
      { status: 'superseded' },
      ncMeta,
    );
  }

  public static async getByLocalProduct(
    context: NcContext,
    localProductId: string,
    tenantId: string,
    ncMeta: any,
  ) {
    const matches = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      'nc_product_matches',
      {
        condition: { 
          local_product_id: localProductId,
          tenant_id: tenantId,
          status: 'matched'
        },
        orderBy: { score: 'desc' },
      },
    );

    return matches.map((match: any) => ProductMatch.castType(match));
  }
}
