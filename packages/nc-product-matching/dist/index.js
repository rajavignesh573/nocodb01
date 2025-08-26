"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = exports.up = exports.ProductMatchSource = exports.ProductMatch = exports.ProductMatchingService = exports.ProductMatchingController = exports.ProductMatchingModule = void 0;
// Main exports
var ProductMatchingModule_1 = require("./ProductMatchingModule");
Object.defineProperty(exports, "ProductMatchingModule", { enumerable: true, get: function () { return ProductMatchingModule_1.ProductMatchingModule; } });
var ProductMatchingController_1 = require("./controllers/ProductMatchingController");
Object.defineProperty(exports, "ProductMatchingController", { enumerable: true, get: function () { return ProductMatchingController_1.ProductMatchingController; } });
var ProductMatchingService_1 = require("./services/ProductMatchingService");
Object.defineProperty(exports, "ProductMatchingService", { enumerable: true, get: function () { return ProductMatchingService_1.ProductMatchingService; } });
// Model exports
var ProductMatch_1 = require("./models/ProductMatch");
Object.defineProperty(exports, "ProductMatch", { enumerable: true, get: function () { return __importDefault(ProductMatch_1).default; } });
var ProductMatchSource_1 = require("./models/ProductMatchSource");
Object.defineProperty(exports, "ProductMatchSource", { enumerable: true, get: function () { return __importDefault(ProductMatchSource_1).default; } });
// Migration exports
var nc_094_product_match_tables_1 = require("./migrations/nc_094_product_match_tables");
Object.defineProperty(exports, "up", { enumerable: true, get: function () { return nc_094_product_match_tables_1.up; } });
Object.defineProperty(exports, "down", { enumerable: true, get: function () { return nc_094_product_match_tables_1.down; } });
//# sourceMappingURL=index.js.map