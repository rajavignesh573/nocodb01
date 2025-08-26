import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProductMatchingService } from '../services/ProductMatchingService';

describe('ProductMatchingService', () => {
  let service: ProductMatchingService;
  let mockNcMeta: any;

  beforeEach(() => {
    mockNcMeta = {
      metaInsert2: jest.fn(),
      metaUpdate: jest.fn(),
      metaGet2: jest.fn(),
      metaList2: jest.fn(),
      metaDelete: jest.fn(),
    };

    service = new ProductMatchingService(mockNcMeta);
  });

  describe('getProducts', () => {
    it('should return empty results for mock implementation', async () => {
      const mockContext = {
        workspace_id: 'test-workspace',
        base_id: 'test-base',
      };

      const filter = {
        q: 'test product',
        limit: 10,
        offset: 0,
      };

      const result = await service.getProducts(mockContext, filter);

      expect(result).toEqual({
        items: [],
        page: 1,
        total: 0,
      });
    });
  });

  describe('getProductById', () => {
    it('should return null for mock implementation', async () => {
      const mockContext = {
        workspace_id: 'test-workspace',
        base_id: 'test-base',
      };

      const result = await service.getProductById(mockContext, 'test-product-id');

      expect(result).toBeNull();
    });
  });

  describe('getExternalCandidates', () => {
    it('should return candidates with mock data', async () => {
      const mockContext = {
        workspace_id: 'test-workspace',
        base_id: 'test-base',
      };

      const localProduct = {
        id: 'test-product',
        title: 'Test Product',
        brand: 'Test Brand',
        price: 100,
      };

      const filter = {
        sources: ['AMZ'],
        limit: 5,
      };

      // Mock the ProductMatchSource.list method
      jest.spyOn(require('../models/ProductMatchSource'), 'default').mockImplementation({
        list: jest.fn().mockResolvedValue([
          {
            id: 'source-1',
            name: 'Amazon',
            code: 'AMZ',
          },
        ]),
      });

      const result = await service.getExternalCandidates(mockContext, localProduct, filter);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('generated_at');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('confirmMatch', () => {
    it('should create a match successfully', async () => {
      const mockContext = {
        workspace_id: 'test-workspace',
        base_id: 'test-base',
      };

      const matchData = {
        local_product_id: 'local-1',
        external_product_key: 'external-1',
        source_code: 'AMZ',
        score: 0.95,
        price_delta_pct: -5.2,
        rule_id: 'rule-1',
        status: 'confirmed' as const,
        notes: 'Test match',
      };

      const userId = 'user-1';

      // Mock the ProductMatchSource.getByCode method
      jest.spyOn(require('../models/ProductMatchSource'), 'default').mockImplementation({
        getByCode: jest.fn().mockResolvedValue({
          id: 'source-1',
          name: 'Amazon',
          code: 'AMZ',
        }),
      });

      // Mock the ProductMatch.insert method
      jest.spyOn(require('../models/ProductMatch'), 'default').mockImplementation({
        insert: jest.fn().mockResolvedValue({
          id: 'match-1',
        }),
      });

      const result = await service.confirmMatch(mockContext, matchData, userId);

      expect(result).toHaveProperty('match_id');
      expect(result.match_id).toBe('match-1');
    });
  });
});
