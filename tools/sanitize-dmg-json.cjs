const fs = require('fs');

const files = [
  'docs/dmg-2024/chapter-03/advice/dm_advice.dmg.chapter03.altered_form.json',
  'docs/dmg-2024/chapter-04/advice/dm_advice.dmg.chapter04.multiple_ways_to_progress.json',
  'docs/dmg-2024/chapter-05/advice/dm_advice.dmg.chapter05.campaign_setting.json',
  'docs/dmg-2024/chapter-05/advice/dm_advice.dmg.chapter05.character_creation.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.city_overview.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.factions_and_organizations.json',
  'docs/dmg-2024/chapter-05/advice/dm_advice.dmg.chapter05.first_adventure.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.home_base.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.key_conflicts.json',
  'docs/dmg-2024/chapter-05/advice/dm_advice.dmg.chapter05.setting_the_stage.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.shar.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.temple_of_the_radiant_sun.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.the_big_picture.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.the_greyhawk_setting.json',
  'docs/dmg-2024/chapter-05/setting_examples/dm_advice.dmg.chapter05.the_rise_of_iuz.json',
  'docs/dmg-2024/chapter-05/advice/dm_advice.dmg.chapter05.using_a_published_setting.json',
  'docs/dmg-2024/chapter-05/procedures/procedure.dmg.chapter05.step_by_step_campaign_flow.json',
];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  let cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  if (file.includes('altered_form')) {
    cleaned = cleaned.replace('\n  },\n  "sourceRef"', '\n  ],\n  "sourceRef"');
  }
  fs.writeFileSync(file, cleaned, 'utf8');
}

console.log(`Sanitized ${files.length} file(s).`);
