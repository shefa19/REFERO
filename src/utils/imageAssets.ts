import heroMarketplaceImg from '../assets/images/hero_marketplace_lifestyle_1791967745637.jpg';
import productOrganicGheeImg from '../assets/images/product_organic_ghee_1791967746424.jpg';
import productPremiumTeaImg from '../assets/images/product_premium_tea_1791967747037.jpg';
import productMustardOilImg from '../assets/images/product_mustard_oil_1791967746741.jpg';
import productHoneyRawImg from '../assets/images/product_honey_raw_1791967747419.jpg';
import ciniguraCalImg from '../assets/images/cinigura cal.jpg';

// Bundled Vite image assets
export const IMAGE_ASSETS = {
  hero: heroMarketplaceImg,
  ghee: productOrganicGheeImg,
  tea: productPremiumTeaImg,
  mustardOil: productMustardOilImg,
  honey: productHoneyRawImg,
  cinigura: ciniguraCalImg,
  defaultProduct: productOrganicGheeImg,
};

// Map of legacy or raw filename strings to bundled production asset URLs
const RAW_PATH_MAP: Record<string, string> = {
  '/src/assets/images/product_organic_ghee_1791967746424.jpg': productOrganicGheeImg,
  '/src/assets/images/product_premium_tea_1791967747037.jpg': productPremiumTeaImg,
  '/src/assets/images/product_mustard_oil_1791967746741.jpg': productMustardOilImg,
  '/src/assets/images/product_honey_raw_1791967747419.jpg': productHoneyRawImg,
  '/src/assets/images/hero_marketplace_lifestyle_1791967745637.jpg': heroMarketplaceImg,
  '/src/assets/images/cinigura cal.jpg': ciniguraCalImg,
  'product_organic_ghee_1791967746424.jpg': productOrganicGheeImg,
  'product_premium_tea_1791967747037.jpg': productPremiumTeaImg,
  'product_mustard_oil_1791967746741.jpg': productMustardOilImg,
  'product_honey_raw_1791967747419.jpg': productHoneyRawImg,
  'hero_marketplace_lifestyle_1791967745637.jpg': heroMarketplaceImg,
  'cinigura cal.jpg': ciniguraCalImg,
};

/**
 * Resolves any image URL or legacy /src/assets/ string into a production-safe Vite bundled asset URL.
 */
export function resolveProductImage(src?: string | null): string {
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return IMAGE_ASSETS.defaultProduct;
  }

  const trimmed = src.trim();

  // 1. Direct match in raw path map
  if (RAW_PATH_MAP[trimmed]) {
    return RAW_PATH_MAP[trimmed];
  }

  // 2. Contains known image file patterns (even if stored in Firestore with varied prefixes)
  if (trimmed.includes('product_organic_ghee')) return productOrganicGheeImg;
  if (trimmed.includes('product_mustard_oil')) return productMustardOilImg;
  if (trimmed.includes('product_premium_tea')) return productPremiumTeaImg;
  if (trimmed.includes('product_honey_raw')) return productHoneyRawImg;
  if (trimmed.includes('hero_marketplace_lifestyle')) return heroMarketplaceImg;
  if (trimmed.includes('cinigura') || trimmed.includes('chinigura')) return ciniguraCalImg;

  // 3. If it starts with /src/assets/ but doesn't match above, strip prefix or fallback
  if (trimmed.startsWith('/src/assets/')) {
    const filename = trimmed.split('/').pop() || '';
    if (RAW_PATH_MAP[filename]) {
      return RAW_PATH_MAP[filename];
    }
    return IMAGE_ASSETS.defaultProduct;
  }

  // 4. Remote URLs (https://, http://) or already bundled assets (/assets/...)
  return trimmed;
}
