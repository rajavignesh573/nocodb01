"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractProps = extractProps;
function extractProps(obj, props) {
    const extracted = {};
    for (const prop of props) {
        if (obj.hasOwnProperty(prop)) {
            extracted[prop] = obj[prop];
        }
    }
    return extracted;
}
//# sourceMappingURL=extractProps.js.map