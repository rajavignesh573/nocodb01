import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProductMatchingService } from '../services/ProductMatchingService';

describe('ProductMatchingService - Simple Tests', () => {
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

  describe('Service Instantiation', () => {
    it('should create service instance with ncMeta', () => {
      expect(service).toBeInstanceOf(ProductMatchingService);
      expect(service).toBeDefined();
    });
  });
});
