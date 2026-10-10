import { ProductCatalogItem, PurchaseOrder } from '../types';

export const DEFAULT_PRODUCT_CATALOG: Array<{ itemId: string; itemName: string }> = [];

export function lookupProductNameByItemId(
  rawItemId: string,
  catalogItems: ProductCatalogItem[],
  existingPos: PurchaseOrder[]
): string | null {
  const cleanId = rawItemId.trim().toUpperCase();
  if (!cleanId) return null;

  // 1. Check live Firestore product catalog
  const fromCatalog = catalogItems.find(
    (c) => c.itemId.trim().toUpperCase() === cleanId
  );
  if (fromCatalog) return fromCatalog.itemName;

  // 2. Check previously entered POs (including multi-item lineItems)
  for (const po of existingPos) {
    if (Array.isArray(po.lineItems)) {
      const matchedLine = po.lineItems.find(
        (li) => li.itemId.trim().toUpperCase() === cleanId && li.itemName.trim().length > 0
      );
      if (matchedLine) return matchedLine.itemName;
    }
    if (po.itemId.trim().toUpperCase() === cleanId && po.itemName.trim().length > 0) {
      return po.itemName;
    }
  }

  // 3. Check built-in default Instamart SKU catalog
  const fromDefault = DEFAULT_PRODUCT_CATALOG.find(
    (d) => d.itemId.toUpperCase() === cleanId
  );
  if (fromDefault) return fromDefault.itemName;

  return null;
}
