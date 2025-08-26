export function extractProps(obj: any, props: string[]): any {
  const extracted: any = {};
  for (const prop of props) {
    if (obj.hasOwnProperty(prop)) {
      extracted[prop] = obj[prop];
    }
  }
  return extracted;
}
