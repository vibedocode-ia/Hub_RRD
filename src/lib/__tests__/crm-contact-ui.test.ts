import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path: string) => fs.readFileSync(path, 'utf8');
test('edit page spreads the client after the address so the client id survives', () => {
  const source = read('src/app/portal/crm/[id]/editar/page.tsx');
  assert.match(source, /\.\.\.\(address\[0\] \|\| \{\}\), \.\.\.client/);
  assert.doesNotMatch(source, /\.\.\.client, \.\.\.\(address\[0\]/);
});
test('edit form sends contactId and keeps a single address lookup', () => {
  const form = read('src/app/portal/crm/[id]/editar/EditClientForm.tsx');
  assert.match(form, /name="contactId"/);
  assert.match(form, /initial\.id/);
  assert.doesNotMatch(form, /db\.select/);
});
test('create form picks an existing contact and never posts a free-text person', () => {
  const source = read('src/app/portal/crm/novo/page.tsx');
  assert.match(source, /name="contactId"/);
  assert.doesNotMatch(source, /name="contactPerson"/);
  assert.match(source, /select/);
  assert.doesNotMatch(source, /from\(clients\)/);
});
test('crm detail surfaces the linked contact without dropping the legacy field', () => {
  const source = read('src/app/portal/crm/[id]/page.tsx');
  assert.match(source, /contactNames \|\| client\.contactPerson/);
  assert.match(source, /Contato \(registro anterior\)/);
  assert.match(source, /from\(contacts\)/);
});
test('crm list route still exposes archived filtering', () => {
  const source = read('src/app/api/crm/route.ts');
  assert.match(source, /searchParams\.get\('archived'\) === 'true'/);
  const contacts = read('src/app/api/contatos/route.ts');
  assert.doesNotMatch(contacts, /clients/);
});
test('forms and routes agree on the contact failure status', () => {
  const route = read('src/app/api/crm/route.ts');
  assert.match(route, /409/);
  assert.match(route, /Contato já vinculado a outro cliente\./);
});
