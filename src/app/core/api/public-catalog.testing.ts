import { PublicProductDto } from './public-catalog.dto';

/** Synthetic contract data, never used by the running application. */
export const productDto = (patch: Partial<PublicProductDto> = {}): PublicProductDto => ({
  id: 313, sku: 'TEST-313', name: 'Instrumento de prueba', description: null, detailedDescription: null,
  price: 6500, discountPrice: null, stock: 18, imageUrl: 'https://res.cloudinary.com/test/image.jpg', images: [],
  category: { id: 20, name: 'Jaranas', parentId: null, parentName: null }, brand: null, attributes: [],
  model: null, weight: null, dimensions: null, featured: true, averageRating: 0, reviewCount: 0, ...patch,
});
export const productPage = (content = [productDto()], patch: Record<string, unknown> = {}) => ({
  content, number: 0, size: 12, totalElements: content.length, totalPages: content.length ? 1 : 0,
  first: true, last: true, ...patch,
});
export const categoryDto = { id: 20, name: 'Jaranas', description: null, imageUrl: null, parentId: null, parentName: null, activeProductCount: 1 };
