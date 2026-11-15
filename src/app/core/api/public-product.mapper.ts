import { PublicProductDto } from './public-catalog.dto';
import { PublicProduct } from '../models/public-product.model';

export function safeImageUrl(raw: string | null, base: string): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw, base + '/');
    const origin = new URL(base);
    if (url.username || url.password) return null;
    if (url.origin !== origin.origin && url.hostname !== 'res.cloudinary.com') return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === origin.origin
        && ['localhost', '127.0.0.1', '10.0.2.2'].includes(origin.hostname))) return null;
    return url.href;
  } catch { return null; }
}
export function mapPublicProduct(dto: PublicProductDto, base: string): PublicProduct {
  const images = [...dto.images].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map(image => safeImageUrl(image.url, base)).filter((url): url is string => url !== null);
  const imageUrl = safeImageUrl(dto.imageUrl, base) ?? images[0] ?? null;
  const gallery = imageUrl && !images.includes(imageUrl) ? [imageUrl, ...images] : images;
  return {
    source: 'http', id: dto.id, name: dto.name, sku: dto.sku, description: dto.detailedDescription ?? dto.description ?? '',
    averageRating: dto.averageRating, reviewCount: dto.reviewCount, model: dto.model, weight: dto.weight, dimensions: dto.dimensions,
    category: dto.category?.name ?? 'Sin categoría', brand: dto.brand?.name ?? 'Sin marca',
    price: dto.discountPrice ?? dto.price,
    originalPrice: dto.discountPrice !== null && dto.discountPrice < dto.price ? dto.price : null,
    stock: dto.stock, availability: dto.stock === null ? 'unknown' : dto.stock > 0 ? 'available' : 'unavailable',
    imageUrl, images: [...new Set(gallery)],
    attributes: [...dto.attributes].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map(a => ({ name: a.name, value: a.value })),
  };
}
