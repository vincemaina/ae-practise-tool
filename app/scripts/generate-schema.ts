/**
 * Generate JSON Schema files from the Zod content schemas (ADR 0008) so editors
 * autocomplete + validate authored question/dataset JSON via their `$schema` ref.
 * Run: pnpm schema:generate
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { questionSchema, datasetSchema } from '../src/content/schema';

function write(name: string, schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { unrepresentable: 'any', target: 'draft-7' });
  const out = fileURLToPath(new URL(`../src/content/${name}`, import.meta.url));
  writeFileSync(out, JSON.stringify(json, null, 2) + '\n');
  console.log(`Wrote ${name}`);
}

write('question.schema.json', questionSchema);
write('dataset.schema.json', datasetSchema);
