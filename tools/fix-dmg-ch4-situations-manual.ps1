$tiers = @{}
$tiers['tier2'] = @(
  @{ roll = '1'; situation = "A group of cultists has summoned a demon to wreak havoc in the city." },
  @{ roll = '2'; situation = "A rebel lures monsters to the cause with the promise of looting the king's treasury." },
  @{ roll = '3'; situation = "An evil Artifact has transformed a forest into a dismal swamp full of horrific monsters." },
  @{ roll = '4'; situation = "An Aberration living in the Underdark sends minions to capture people from the surface to turn those people into new minions." },
  @{ roll = '5'; situation = "A monster (perhaps a devil, slaad, or hag) is impersonating a prominent noble to throw the realm into civil war." },
  @{ roll = '6'; situation = "A master thief plans to steal royal regalia." },
  @{ roll = '7'; situation = "A golem intended to serve as a protector has gone berserk and captured its creator." },
  @{ roll = '8'; situation = "A conspiracy of spies, assassins, and necromancers schemes to overthrow a ruler." },
  @{ roll = '9'; situation = "After establishing a lair, a young dragon is trying to earn the fear and respect of other creatures living nearby." },
  @{ roll = '10'; situation = "The approach of a lone giant alarms the people of a town, but the giant is simply looking for a place to live in peace." },
  @{ roll = '11'; situation = "An enormous monster on display in a menagerie breaks free and goes on a rampage." },
  @{ roll = '12'; situation = "A coven of hags steals cherished memories from travelers." },
  @{ roll = '13'; situation = "A villain seeks powerful magic in an ancient ruin, hoping to use it to conquer the region." },
  @{ roll = '14'; situation = "A scheming aristocrat hosts a masquerade ball, which many guests see as an opportunity to advance their own agendas. At least one shape-shifting monster also attends." },
  @{ roll = '15'; situation = "A ship carrying a valuable treasure or an evil Artifact sinks in a storm or monster attack." },
  @{ roll = '16'; situation = "A natural disaster was actually caused by magic gone awry or a cult's villainous plans." },
  @{ roll = '17'; situation = "A secretive cult uses spies to heighten tensions between two rival nations, hoping to provoke a war that will weaken both." },
  @{ roll = '18'; situation = "Rebels or forces of an enemy nation have kidnapped an important noble." },
  @{ roll = '19'; situation = "The descendants of a displaced people want to reclaim their ancestral city, which is now inhabited by monsters." },
  @{ roll = '20'; situation = "A renowned group of adventurers never returned from an expedition to a famous ruin." }
)
$tiers['tier3'] = @(
  @{ roll = '1'; situation = "A portal to the Abyss opens in a cursed location and spews demons into the world." },
  @{ roll = '2'; situation = "A band of hunting giants has driven its prey - enormous beasts - into pastureland." },
  @{ roll = '3'; situation = "An adult dragon's lair is transforming an expanse into an environment inhospitable to the other creatures living there." },
  @{ roll = '4'; situation = "A long-lost journal describes an incredible journey to a hidden subterranean realm full of magical wonders." },
  @{ roll = '5'; situation = "Cultists hope to persuade a dragon to undergo the rite that will transform it into a dracolich." },
  @{ roll = '6'; situation = "The ruler of the realm is sending an emissary to a hostile neighbor to negotiate a truce, and the emissary needs protection." },
  @{ roll = '7'; situation = "A castle or city has been drawn into another plane of existence." },
  @{ roll = '8'; situation = "A storm tears across the land, with a mysterious flying citadel in the eye of the storm." },
  @{ roll = '9'; situation = "Two parts of a magic item are in the hands of bitter enemies; the third piece is lost." },
  @{ roll = '10'; situation = "Evil cultists gather from around the world to summon a monstrous god or alien entity." },
  @{ roll = '11'; situation = "A tyrannical ruler outlaws the use of magic without official sanction. A secret society of spellcasters seeks to oust the tyrant." },
  @{ roll = '12'; situation = "During a drought, low water levels in a lake reveal previously unknown ancient ruins that contain a powerful evil." }
)
$tiers['tier4'] = @(
  @{ roll = '1'; situation = "An ancient dragon is scheming to destroy a god and take the god's place in the pantheon. The dragon's minions are searching for Artifacts that can summon and weaken this god." },
  @{ roll = '2'; situation = "A band of giants drove away a metallic dragon and took over the dragon's lair, and the dragon wants to reclaim the lair." },
  @{ roll = '3'; situation = "An ancient hero returns from the dead to prepare the world for the return of an equally ancient monster." },
  @{ roll = '4'; situation = "An ancient Artifact has the power to defeat or imprison a rampaging titan." },
  @{ roll = '5'; situation = "A god of agriculture is angry, causing rivers to dry up and crops to wither." },
  @{ roll = '6'; situation = "An Artifact belonging to a god falls into mortal hands." },
  @{ roll = '7'; situation = "A titan imprisoned in the Underdark begins to break free, causing terrible earthquakes that are only a hint of the destruction that the titan will cause if it is released." },
  @{ roll = '8'; situation = "A lich tries to exterminate any spellcasters that approach the lich's level of power." },
  @{ roll = '9'; situation = "A holy temple was built around a portal leading to one of the Lower Planes to prevent any evil from passing through in either direction. Now the temple has come under siege from both directions." },
  @{ roll = '10'; situation = "Five ancient metallic dragons lair in the Pillars of Creation. If all these dragons are killed, the world will collapse into chaos. One has just been slain." }
)

function Update-Table($path, $entries) {
  $doc = Get-Content -Path $path | ConvertFrom-Json
  $doc.entries = $entries
  $doc.status = 'complete'
  $doc.notes = @()
  $doc | ConvertTo-Json -Depth 6 | Set-Content -Path $path
}

Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_2.json" $tiers['tier2']
Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_3.json" $tiers['tier3']
Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_4.json" $tiers['tier4']
