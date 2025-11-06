import { tsquery } from '@phenomnomnominal/tsquery';
import { Node } from 'ts-morph';

export function query(node: Node, query: string) {
  return tsquery((node as any).compilerNode, query).map((n) => (node as any)._getNodeFromCompilerNode(n) as Node);
}
