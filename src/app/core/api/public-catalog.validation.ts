import { PublicPage, PublicProductDto } from './public-catalog.dto';
import { ApiError } from './api-error';

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const nullableText = (value: unknown) => value === null || text(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const id = (value: unknown) => integer(value) && value > 0;
const amount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100;
const order = (value: unknown) => value === null || integer(value);

export function isPublicProduct(value: unknown): value is PublicProductDto {
  if (!object(value)) return false;
  const v = value;
  return id(v['id']) && text(v['sku']) && text(v['name']) && !!v['name'].trim()
    && nullableText(v['description']) && nullableText(v['detailedDescription'])
    && amount(v['price']) && (v['discountPrice'] === null || (amount(v['discountPrice']) && v['discountPrice'] <= v['price']))
    && (v['stock'] === null || integer(v['stock'])) && nullableText(v['imageUrl'])
    && Array.isArray(v['images']) && v['images'].every(i => object(i) && text(i['url']) && order(i['displayOrder']))
    && (v['category'] === null || (object(v['category']) && id(v['category']['id']) && text(v['category']['name'])
      && (v['category']['parentId'] === null || id(v['category']['parentId'])) && nullableText(v['category']['parentName'])))
    && (v['brand'] === null || (object(v['brand']) && id(v['brand']['id']) && text(v['brand']['name']) && nullableText(v['brand']['logoUrl'])))
    && Array.isArray(v['attributes']) && v['attributes'].every(a => object(a) && text(a['name']) && text(a['value']) && order(a['displayOrder']))
    && nullableText(v['model']) && (v['weight'] === null || amount(v['weight'])) && nullableText(v['dimensions'])
    && typeof v['featured'] === 'boolean'
    && (v['averageRating'] === null || (amount(v['averageRating']) && v['averageRating'] <= 5)) && integer(v['reviewCount']);
}
export function parseProducts(value: unknown): readonly PublicProductDto[] {
  if (!Array.isArray(value) || !value.every(isPublicProduct)) throw new ApiError('invalid-response', 200);
  return value;
}
export function parseProduct(value: unknown): PublicProductDto {
  if (!isPublicProduct(value)) throw new ApiError('invalid-response', 200);
  return value;
}
export function parseProductPage(value: unknown): PublicPage<PublicProductDto> {
  if (!object(value) || !integer(value['number']) || !integer(value['size']) || value['size'] < 1 || value['size'] > 50
      || !integer(value['totalElements']) || !integer(value['totalPages'])
      || typeof value['first'] !== 'boolean' || typeof value['last'] !== 'boolean') throw new ApiError('invalid-response', 200);
  const content = parseProducts(value['content']);
  if (content.length > value['size'] || value['totalElements'] < content.length
      || value['totalPages'] !== Math.ceil(value['totalElements'] / value['size'])) throw new ApiError('invalid-response', 200);
  return { content, number: value['number'], size: value['size'], totalElements: value['totalElements'],
    totalPages: value['totalPages'], first: value['first'], last: value['last'] };
}
