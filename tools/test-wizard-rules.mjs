import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';

const wizardPath = path.resolve('admin/public/wizard.js');
const source = fs.readFileSync(wizardPath, 'utf8');

const windowStub = {
  addEventListener: () => {},
  __wizardTestExports: null,
};
const documentStub = {
  getElementById: () => null,
  querySelectorAll: () => [],
};

const context = vm.createContext({
  window: windowStub,
  document: documentStub,
  console,
  setTimeout,
  clearTimeout,
});

vm.runInContext(source, context, { filename: 'wizard.js' });

const exports = windowStub.__wizardTestExports;
assert.ok(exports, 'wizard test exports missing');

const { parseClassSkillChoices, deriveClassSkillChoices, validateSkillSelection, normalizeName } = exports;
const { parseSubclassRequirement } = exports;

{
  const parsed = parseClassSkillChoices('Choose 2: Arcana, Animal Handling, Nature', [
    'arcana',
    'animalhandling',
    'nature',
    'athletics',
  ]);
  assert.equal(parsed.limit, 2, 'limit should be 2');
  assert.equal(parsed.allowedKeys.slice().sort().join(','), ['arcana', 'animalhandling', 'nature'].sort().join(','));
}

{
  const parsed = deriveClassSkillChoices(
    { proficiencies: { skills_choose: { count: 2, from: ['Arcana', 'Nature'] } } },
    []
  );
  assert.equal(parsed.limit, 2, 'limit should be 2 from object');
  assert.equal(parsed.allowedKeys.join(','), [normalizeName('Arcana'), normalizeName('Nature')].join(','));
}

{
  const ok = validateSkillSelection({
    limit: 2,
    allowedKeys: ['arcana', 'nature', 'religion'],
    selectedKeys: ['arcana', 'nature'],
  });
  assert.equal(ok.ok, true, 'selection within limit should be ok');
}

{
  const tooMany = validateSkillSelection({
    limit: 2,
    allowedKeys: ['arcana', 'nature', 'religion'],
    selectedKeys: ['arcana', 'nature', 'religion'],
  });
  assert.equal(tooMany.ok, false, 'selection over limit should fail');
}

{
  const noneAllowed = validateSkillSelection({
    limit: 0,
    allowedKeys: [],
    selectedKeys: ['arcana'],
  });
  assert.equal(noneAllowed.ok, false, 'selection should fail when limit is 0');
}

{
  const requirement = parseSubclassRequirement({ level_gained: 6 });
  assert.equal(requirement, 6, 'subclass requirement should read level_gained');
}

console.log('wizard rules tests ok');
