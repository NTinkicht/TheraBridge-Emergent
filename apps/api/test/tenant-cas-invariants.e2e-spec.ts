import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

// An AST guard (not a grep) prevents future clinical CAS writes from silently
// dropping their center boundary.
const files = [
  'clinical.service.ts', 'governance.service.ts', 'home-plan-requests.service.ts',
  'practice.service.ts', 'report-decisions.service.ts', 'reports.service.ts',
  'session.service.ts',
];
const tenantModels = new Set([
  'assessment', 'planVersion', 'sessionNote', 'activityTemplate',
  'progressReport', 'practiceOutcome', 'homePlanRequest',
  'caseloadTransferDraft', 'reportSuggestionDecision',
]);
function key(n: ts.PropertyName): string | null {
  return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : null;
}
function field(obj: ts.ObjectLiteralExpression, name: string) {
  return obj.properties.find(p =>
    (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
    key(p.name) === name);
}
describe('M2-H02: clinical CAS tenancy invariant', () => {
  it('requires explicit centerId in every tenant-scoped updateMany predicate', () => {
    const absent: string[] = [];
    let audited = 0;
    for (const name of files) {
      const source = ts.createSourceFile(name,
        readFileSync(resolve(__dirname, '../src/clinical', name), 'utf8'),
        ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'updateMany' &&
            ts.isPropertyAccessExpression(node.expression.expression)) {
          const model = node.expression.expression.name.text;
          if (tenantModels.has(model)) {
            audited += 1;
            const arg = node.arguments[0];
            const where = arg && ts.isObjectLiteralExpression(arg)
              ? field(arg, 'where') : undefined;
            const scoped = where && ts.isPropertyAssignment(where) &&
              ts.isObjectLiteralExpression(where.initializer) &&
              !!field(where.initializer, 'centerId');
            if (!scoped) absent.push(`${name}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} (${model})`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(audited).toBeGreaterThanOrEqual(14);
    expect(absent).toEqual([]);
  });
});
