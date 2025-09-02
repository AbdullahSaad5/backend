import { Types } from 'mongoose';
import { Listing } from '@/models/listing.model';

export interface ProductResolutionResult {
  found: Array<{
    alias: string;
    objectId: Types.ObjectId;
    name: string;
  }>;
  missing: string[];
}

/**
 * Resolves product aliases/IDs to actual MongoDB ObjectIds
 * @param productIdentifiers Array of product aliases, SKUs, or IDs
 * @returns Object containing found products and missing identifiers
 */
export async function resolveProductIds(productIdentifiers: string[]): Promise<ProductResolutionResult> {
  console.log("🔵 [PRODUCT_RESOLVER] Starting product resolution for identifiers:", productIdentifiers);
  
  if (!productIdentifiers || productIdentifiers.length === 0) {
    console.log("🔵 [PRODUCT_RESOLVER] No product identifiers provided");
    return { found: [], missing: [] };
  }

  // Filter out null/undefined values
  const validIdentifiers = productIdentifiers.filter(id => id && typeof id === 'string');
  console.log("🔵 [PRODUCT_RESOLVER] Valid identifiers after filtering:", validIdentifiers);
  
  try {
    // Try to find products by alias first (most likely scenario)
    console.log("🔍 [PRODUCT_RESOLVER] Looking up products by alias...");
    const foundByAlias = await Listing.find({
      alias: { $in: validIdentifiers }
    }).select('_id alias').lean() as any;
    
    console.log(`✅ [PRODUCT_RESOLVER] Found ${foundByAlias.length} products by alias:`, foundByAlias);

    // Try to find by ObjectId for any remaining identifiers
    const foundAliases = foundByAlias.map((p: any) => p.alias);
    const remainingIdentifiers = validIdentifiers.filter(id => !foundAliases.includes(id));
    console.log("🔍 [PRODUCT_RESOLVER] Remaining identifiers to check:", remainingIdentifiers);
    
    // Check if any remaining identifiers are valid ObjectIds
    const validObjectIds = remainingIdentifiers.filter(id => Types.ObjectId.isValid(id));
    console.log("🔍 [PRODUCT_RESOLVER] Valid ObjectIds to check:", validObjectIds);
    
    const foundByObjectId = validObjectIds.length > 0 
      ? await Listing.find({
          _id: { $in: validObjectIds.map(id => new Types.ObjectId(id)) }
        }).select('_id alias').lean() as any
      : [];
      
    console.log(`✅ [PRODUCT_RESOLVER] Found ${foundByObjectId.length} products by ObjectId:`, foundByObjectId);

    // Combine results
    const allFound = [
      ...foundByAlias.map((p: any) => ({
        alias: p.alias,
        objectId: p._id,
        name: p.alias || 'Unknown Product'
      })),
      ...foundByObjectId.map((p: any) => ({
        alias: p._id.toString(),
        objectId: p._id,
        name: p.alias || 'Unknown Product'
      }))
    ];

    // Determine what's missing
    const foundIdentifiers = [
      ...foundByAlias.map((p: any) => p.alias),
      ...foundByObjectId.map((p: any) => p._id.toString())
    ];
    
    const missing = validIdentifiers.filter(id => !foundIdentifiers.includes(id));

    console.log(`🔵 [PRODUCT_RESOLVER] Resolution complete. Found: ${allFound.length}, Missing: ${missing.length}`);
    console.log("🔵 [PRODUCT_RESOLVER] Found products:", allFound);
    console.log("🔵 [PRODUCT_RESOLVER] Missing products:", missing);

    return {
      found: allFound,
      missing
    };

  } catch (error) {
    console.error('❌ [PRODUCT_RESOLVER] Error resolving product IDs:', error);
    return {
      found: [],
      missing: validIdentifiers
    };
  }
}

/**
 * Creates a lookup map from product identifier to ObjectId
 */
export function createProductIdMap(resolutionResult: ProductResolutionResult): Map<string, Types.ObjectId> {
  const map = new Map<string, Types.ObjectId>();
  
  resolutionResult.found.forEach(product => {
    map.set(product.alias, product.objectId);
  });
  
  return map;
}
