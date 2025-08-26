import { Response, Request } from 'express';
import { ProductMatchingService } from '~/services/ProductMatchingService';
import type { NcContext } from '~/interface/config';
export declare class ProductMatchingController {
    private readonly productMatchingService;
    constructor(productMatchingService: ProductMatchingService);
    health(res: Response): Promise<Response<any, Record<string, any>>>;
    info(req: Request & {
        context: NcContext;
    }, res: Response): Promise<Response<any, Record<string, any>>>;
    getProducts(req: Request & {
        context: NcContext;
    }, res: Response, query: any): Promise<Response<any, Record<string, any>>>;
    getCandidates(req: Request & {
        context: NcContext;
    }, res: Response, productId: string, query: any): Promise<Response<any, Record<string, any>>>;
    confirmMatch(req: Request & {
        context: NcContext;
    }, res: Response, body: any): Promise<Response<any, Record<string, any>>>;
    deleteMatch(req: Request & {
        context: NcContext;
    }, res: Response, matchId: string): Promise<Response<any, Record<string, any>>>;
    getMatches(req: Request & {
        context: NcContext;
    }, res: Response, query: any): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ProductMatchingController.d.ts.map