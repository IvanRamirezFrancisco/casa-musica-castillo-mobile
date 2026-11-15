import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DefaultTreeAdapterTypes, parseFragment } from 'parse5';

type Tag = 'p' | 'strong' | 'em' | 'ul' | 'ol' | 'li' | 'br';
type DescriptionNode = string | { tag: Tag; children: DescriptionNode[] };
const tags = new Map<string, Tag>([
  ['p', 'p'], ['strong', 'strong'], ['b', 'strong'], ['em', 'em'],
  ['ul', 'ul'], ['ol', 'ol'], ['li', 'li'], ['br', 'br'],
]);

function readNodes(nodes: DefaultTreeAdapterTypes.ChildNode[], raw: string, depth = 0): DescriptionNode[] {
  return nodes.flatMap((node): DescriptionNode[] => {
    if ('value' in node) return [node.value];
    if (!('tagName' in node)) return [];
    const tag = node.namespaceURI === 'http://www.w3.org/1999/xhtml' ? tags.get(node.tagName) : undefined;
    if (tag && depth < 32) return [{ tag, children: readNodes(node.childNodes, raw, depth + 1) }];
    const location = node.sourceCodeLocation;
    return location ? [raw.slice(location.startOffset, location.endOffset)] : [];
  });
}

@Component({
  selector: 'cmc-product-description',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-description.component.html',
})
export class ProductDescriptionComponent {
  readonly description = input.required<string>();
  readonly nodes = computed(() => {
    const raw = this.description();
    return raw.trim() ? readNodes(parseFragment(raw, { sourceCodeLocationInfo: true }).childNodes, raw) : [];
  });
}
