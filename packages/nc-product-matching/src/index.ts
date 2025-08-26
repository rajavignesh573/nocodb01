// Main exports
export { ProductMatchingModule } from './ProductMatchingModule';
export { ProductMatchingController } from './controllers/ProductMatchingController';
export { ProductMatchingService } from './services/ProductMatchingService';

// Model exports
export { default as ProductMatch } from './models/ProductMatch';
export { default as ProductMatchSource } from './models/ProductMatchSource';

// Type exports
export type { ProductMatchType } from './models/ProductMatch';
export type { ProductMatchSourceType } from './models/ProductMatchSource';
export type { 
  Product, 
  ExternalProduct, 
  CandidateFilter, 
  ProductFilter 
} from './services/ProductMatchingService';

// Migration exports
export { up, down } from './migrations/nc_094_product_match_tables';
