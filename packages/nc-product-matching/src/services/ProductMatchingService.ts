import type { NcContext } from '../interface/config';
import ProductMatch from '../models/ProductMatch';
import ProductMatchSource from '../models/ProductMatchSource';

export interface Product {
  id: string;
  title: string;
  brand?: string;
  category_id?: string;
  price?: number;
  gtin?: string;
  media?: Array<{ url: string }>;
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

export class ProductMatchingService {
  constructor(private readonly ncMeta: any) {}

  async getProducts(
    context: NcContext,
    filter: ProductFilter,
  ): Promise<{ items: Product[]; page: number; total: number }> {
    try {
      // Query internal products from database
      const queryOptions: any = {
        condition: {
          tenant_id: context.workspace_id || 'default',
          is_active: true
        },
        limit: filter.limit || 20,
        offset: filter.offset || 0
      };

      // Apply search filter
      if (filter.q) {
        // For now, we'll filter in memory since the mock NcMeta doesn't support complex queries
        // In a real implementation, this would be a database query
      }

      // Apply sorting
      if (filter.sortBy === 'title') {
        queryOptions.orderBy = { title: filter.sortDir || 'asc' };
      } else if (filter.sortBy === 'brand') {
        queryOptions.orderBy = { brand: filter.sortDir || 'asc' };
      }
      // If no sorting is specified, don't include orderBy in queryOptions

      const products = await this.ncMeta.metaList2(
        context.workspace_id,
        'default',
        'nc_internal_products',
        queryOptions
      );

      // Apply filters in memory (in real implementation, these would be database queries)
      let filteredProducts = products;

      if (filter.q) {
        const searchTerm = filter.q.toLowerCase();
        filteredProducts = filteredProducts.filter((product: any) =>
          product.title.toLowerCase().includes(searchTerm) ||
          product.brand?.toLowerCase().includes(searchTerm)
        );
      }

      if (filter.brand) {
        filteredProducts = filteredProducts.filter((product: any) => product.brand === filter.brand);
      }

      if (filter.categoryId) {
        filteredProducts = filteredProducts.filter((product: any) => product.category_id === filter.categoryId);
      }

      // Transform to Product interface
      const items: Product[] = filteredProducts.map((product: any) => ({
        id: product.id,
        title: product.title,
        brand: product.brand,
        category_id: product.category_id,
        price: product.price ? Number(product.price) : undefined,
        gtin: product.gtin,
        media: product.image_url ? [{ url: product.image_url }] : undefined
      }));

      const page = filter.offset ? Math.floor(filter.offset / (filter.limit || 20)) + 1 : 1;
      const total = items.length;

      return { items, page, total };
    } catch (error) {
      console.error('Error getting products:', error);
      // Fallback to empty result
      return { items: [], page: 1, total: 0 };
    }
  }

  async getProductById(
    context: NcContext,
    productId: string,
  ): Promise<Product | null> {
    try {
      const product = await this.ncMeta.metaGet2(
        context.workspace_id,
        'default',
        'nc_internal_products',
        productId
      );

      if (!product) return null;

      return {
        id: product.id,
        title: product.title,
        brand: product.brand,
        category_id: product.category_id,
        price: product.price ? Number(product.price) : undefined,
        gtin: product.gtin,
        media: product.image_url ? [{ url: product.image_url }] : undefined
      };
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return null;
    }
  }

  async getExternalCandidates(
    context: NcContext,
    localProduct: Product,
    filter: CandidateFilter,
  ): Promise<{ items: ExternalProduct[]; generated_at: string }> {
    try {
      const candidates: ExternalProduct[] = [];
      const generated_at = new Date().toISOString();

      // Get active sources
      const sources = await ProductMatchSource.list(context, 100, 0, this.ncMeta);
      const activeSources = sources.filter((source: any) => 
        !filter.sources || filter.sources.includes(source.code || '')
      );

      // For each source, find candidates
      for (const source of activeSources) {
        const sourceCandidates = await this.findCandidatesForSource(
          context,
          localProduct,
          source,
          filter,
        );
        candidates.push(...sourceCandidates);
      }

      // Sort by score and limit results
      candidates.sort((a, b) => b.score - a.score);
      const limit = filter.limit || 25;
      const limitedCandidates = candidates.slice(0, limit);

      return {
        items: limitedCandidates,
        generated_at,
      };
    } catch (error) {
      console.error('Error getting external candidates:', error);
      return { items: [], generated_at: new Date().toISOString() };
    }
  }

  private async findCandidatesForSource(
    context: NcContext,
    localProduct: Product,
    source: any,
    filter: CandidateFilter,
  ): Promise<ExternalProduct[]> {
    try {
      // Query external products from database for this source
      const externalProducts = await this.ncMeta.metaList2(
        context.workspace_id,
        'default',
        'nc_external_products',
        {
          condition: {
            source_id: source.id,
            availability: true
          },
          limit: 50
        }
      );

      const candidates: ExternalProduct[] = [];

      for (const extProduct of externalProducts) {
        // Calculate similarity score
        const score = this.calculateSimilarityScore(localProduct, extProduct);
        
        // Apply minimum score filter
        if (score >= (filter.ruleId === 'rule-strict-001' ? 0.8 : 0.65)) {
          // Calculate price difference percentage
          const extPrice = extProduct.price ? Number(extProduct.price) : undefined;
          const priceDelta = localProduct.price && extPrice 
            ? ((extPrice - localProduct.price) / localProduct.price) * 100
            : 0;

          // Apply price band filter
          const priceBandPct = filter.priceBandPct || 15;
          if (Math.abs(priceDelta) <= priceBandPct) {
            candidates.push({
              external_product_key: extProduct.external_product_key,
              source: {
                id: source.id || '',
                code: source.code || '',
                name: source.name || '',
              },
              title: extProduct.title,
              brand: extProduct.brand,
              price: extProduct.price ? Number(extProduct.price) : undefined,
              image: extProduct.image_url,
              gtin: extProduct.gtin,
              score: score,
              explanations: {
                name: this.calculateNameSimilarity(localProduct.title, extProduct.title),
                brand: this.calculateBrandSimilarity(localProduct.brand, extProduct.brand),
                category: 1.0, // Assuming same category for now
                price: this.calculatePriceSimilarity(localProduct.price, extPrice),
                gtin: localProduct.gtin === extProduct.gtin ? 1.0 : 0.0
              }
            });
          }
        }
      }

      return candidates;
    } catch (error) {
      console.error('Error finding candidates for source:', error);
      return [];
    }
  }

  private calculateSimilarityScore(localProduct: Product, externalProduct: any): number {
    const nameScore = this.calculateNameSimilarity(localProduct.title, externalProduct.title);
    const brandScore = this.calculateBrandSimilarity(localProduct.brand, externalProduct.brand);
    const priceScore = this.calculatePriceSimilarity(localProduct.price, externalProduct.price ? Number(externalProduct.price) : undefined);
    const gtinScore = localProduct.gtin === externalProduct.gtin ? 1.0 : 0.0;

    // Weighted average (default weights)
    return (nameScore * 0.4 + brandScore * 0.3 + priceScore * 0.1 + gtinScore * 0.2);
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    
    const words1 = name1.toLowerCase().split(/\s+/);
    const words2 = name2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  private calculateBrandSimilarity(brand1?: string, brand2?: string): number {
    if (!brand1 || !brand2) return 0;
    return brand1.toLowerCase() === brand2.toLowerCase() ? 1.0 : 0.0;
  }

  private calculatePriceSimilarity(price1?: number, price2?: number): number {
    if (!price1 || !price2) return 0;
    
    const diff = Math.abs(price1 - price2);
    const avgPrice = (price1 + price2) / 2;
    
    if (avgPrice === 0) return 0;
    
    const percentageDiff = (diff / avgPrice) * 100;
    
    // Higher score for smaller price differences
    if (percentageDiff <= 5) return 1.0;
    if (percentageDiff <= 10) return 0.9;
    if (percentageDiff <= 15) return 0.8;
    if (percentageDiff <= 20) return 0.7;
    if (percentageDiff <= 25) return 0.6;
    return 0.5;
  }

  async confirmMatch(
    context: NcContext,
    matchData: {
      local_product_id: string;
      external_product_key: string;
      source_code: string;
      score: number;
      price_delta_pct: number;
      rule_id: string;
      status: 'matched' | 'not_matched';
      session_id?: string;
      notes?: string;
    },
    userId: string,
  ): Promise<{ match_id: string }> {
    // Get source by code
    const source = await ProductMatchSource.getByCode(
      context,
      matchData.source_code,
      this.ncMeta,
    );

    if (!source) {
      throw new Error(`Source not found: ${matchData.source_code}`);
    }

    // Create the match
    const match = await ProductMatch.insert(
      context,
      {
        tenant_id: context.workspace_id,
        local_product_id: matchData.local_product_id,
        external_product_key: matchData.external_product_key,
        source_id: source.id,
        score: matchData.score,
        price_delta_pct: matchData.price_delta_pct,
        rule_id: matchData.rule_id,
        session_id: matchData.session_id,
        status: matchData.status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        notes: matchData.notes,
        created_by: userId,
      },
      this.ncMeta,
    );

    return { match_id: match.id || '' };
  }

  async getMatches(
    context: NcContext,
    filters: {
      localProductId?: string;
      externalProductKey?: string;
      source?: string;
      reviewedBy?: string;
      status?: string;
    } = {},
    limit = 50,
    offset = 0,
  ): Promise<{ items: any[]; page: number; total: number }> {
    const matches = await ProductMatch.list(
      context,
      {
        localProductId: filters.localProductId,
        externalProductKey: filters.externalProductKey,
        sourceId: filters.source,
        reviewedBy: filters.reviewedBy,
        status: filters.status,
        tenantId: context.workspace_id,
      },
      limit,
      offset,
      this.ncMeta,
    );

    return {
      items: matches,
      page: Math.floor(offset / limit) + 1,
      total: matches.length, // This should be a count query in real implementation
    };
  }

  async deleteMatch(
    context: NcContext,
    matchId: string,
  ): Promise<void> {
    await ProductMatch.delete(context, matchId, this.ncMeta);
  }
}
