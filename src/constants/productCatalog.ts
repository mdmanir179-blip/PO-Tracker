import { ProductCatalogItem, PurchaseOrder } from '../types';

export const DEFAULT_PRODUCT_CATALOG: Array<{ itemId: string; itemName: string }> = [
  { itemId: 'SKU-1001', itemName: 'Organic Cold Pressed Almond Oil 500ml' },
  { itemId: 'SKU-1002', itemName: 'A2 Gir Cow Cultured Ghee 500ml Glass Jar' },
  { itemId: 'SKU-1003', itemName: 'Himalayan Pink Rock Salt 1kg Pouch' },
  { itemId: 'SKU-1004', itemName: 'Raw Unprocessed Wild Forest Honey 500g' },
  { itemId: 'SKU-1005', itemName: 'Extra Virgin Coconut Oil 1L Bottle' },
  { itemId: 'SKU-1006', itemName: 'Roasted California Pistachios Salted 250g' },
  { itemId: 'SKU-1007', itemName: 'Premium Whole Cashews W240 Grade 500g' },
  { itemId: 'SKU-1008', itemName: 'Organic Chia Seeds Superfood Pack 250g' },
  { itemId: 'SKU-1009', itemName: 'Rolled Breakfast Oats Gluten-Free 1kg' },
  { itemId: 'SKU-1010', itemName: 'Dark Chocolate Peanut Butter Crunchy 510g' },
  { itemId: 'SKU-99201', itemName: 'Instamart Daily Fresh Whole Wheat Atta 5kg' },
  { itemId: 'SKU-99202', itemName: 'Premium Basmati Rice Aged 24 Months 5kg' },
];

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
