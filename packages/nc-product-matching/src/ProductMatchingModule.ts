import { Module } from '@nestjs/common';
import { ProductMatchingController } from './controllers/ProductMatchingController';
import { ProductMatchingService } from './services/ProductMatchingService';

@Module({
  controllers: [ProductMatchingController],
  providers: [ProductMatchingService],
  exports: [ProductMatchingService],
})
export class ProductMatchingModule {}
