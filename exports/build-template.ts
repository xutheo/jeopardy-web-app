import {readFileSync,writeFileSync} from 'node:fs';
import {allModesSampleContent} from '../shared/sample';
import {contentSchema,isClueReady} from '../shared/model';
import {sampleBombLevels} from '../shared/sample-bombs';
const category=(title:string,pairs:string[][],extra={})=>({title,...extra,clues:pairs.map(([prompt,answer])=>({prompt,answer,used:false}))});
const sample=allModesSampleContent();
const bombs=sampleBombLevels();
bombs[0].hints[1]='The star wire is cut before the square wire.';
bombs[2].hints[0]='Only the wires with convex polygon shapes will be cut.';
bombs[3].hints=['Cut the shape with the most lines of symmetry third.','The red wire is cut before the purple wire.','Any wire with a polygon shape with less than 4 sides should not be cut at all.','The green wire should be cut first.'];
bombs[3].solution=['Green ■','Red ★','Blue ●','Purple ◆'];
const ghost=category('Ghost Pokemon',[
['Name this pokemon.','Duskull'],
['This pokemon was the only ghost pokemon to be released in generation II.','Misdreavus'],
['This pokemon has this pokedex entry: "It wears a rag fashioned into a Pikachu costume in an effort to look less scary. Unfortunately, the costume only makes it creepier."','Mimikyu'],
['This generation IV electric/ghost pokemon was introduced in Diamond & Pearl with only one form. However, in Pokemon Platinum, it received additional forms dependent on the type of household appliance it possesses.','Rotom'],
['This ghost pokemon is named ゴースト (Gosuto) in Japanese, which translates to "Ghost". What is its English name?','Haunter']]);
Object.assign(ghost.clues[0],{image:'data:image/png;base64,'+readFileSync('images-for-qb-questions/duskull.png').toString('base64'),imageAlt:'Identify this mystery Pokemon.'});
const content=contentSchema.parse({name:'Jelley — Qoobee Questions',boards:[[
category('Jelley',[
['How many siblings does Jelley have?','1–1 (one each)'],
['What year did Jelley get married?','2023'],
["When are Jelley’s birthdays?",'May 3rd and August 1st'],
['How many piplups are in the house (no stickers)?','20–30'],
['Name the countries that Jelley traveled to this year? (100 points for each)','China, Canada, Italy, Greece, Spain, Croatia, France']]),
category('Fire Emblem',[
['This prince of Altea is known as the original hero of Fire Emblem and wields the legendary Falchion.','Marth'],
['In most mainline Fire Emblem games, this mechanic gives swords an advantage over axes, spears an advantage over swords, and axes an advantage over spears.','Weapon Triangle'],
['This Fire Emblem game introduced the time-traveling daughter of Chrom, who wears a distinctive purple mask and goes by the name “Marth.”','Awakening'],
['In Fire Emblem: Three Houses, this former Adrestian emperor founded a church after defeating Nemesis in the War of Heroes.','Seiros'],
['In Fire Emblem: The Blazing Blade, this character is the tactician whose gender and name can be customized by the player.','Mark']]),
category('Homonyms',[
['Flying mammal found in caves; Piece of equipment found in baseball','Bat'],
['Financial institution; Land along a river','Bank'],
['Cylindrical container; The act of firing someone','Can'],
['Secret agent; SI unit for the amount of a substance','Mole'],
['Formal agreement between two parties; Process of becoming smaller in size','Contract']]),
category('Spooky Stats',[
['How many bones are typically in a human skeleton?','206'],
['What percentage of Americans plan to celebrate Halloween this year?','74%'],
['4.8 million Americans are planning to dress up as a witch, the top ranked costume for adults. How many Americans are expected to dress up as Batman, the third ranked costume?','2 million'],
['In October 2026, a Rhode Island grower set a new world record for the heaviest pumpkin. How many pounds did it weigh?','3,156 lbs'],
['How many billions of dollars are Americans projected to spend on Halloween in 2026?','13.5 billion']],{openToAll:true}),
sample.boards[1][2]
],[ghost,
category('Qoobee Questions',[
['This title is often given to a female monarch.','Queen'],
['This is a 14-line poem traditionally written in iambic pentameter with a strict rhyme scheme and a thematic turn.','Sonnet'],
['This chemical element is known as Sn on the periodic table with atomic number 50. It is commonly used to coat steel cans for food, beverages, and oils.','Tin'],
['This quantum version of the classic binary bit is the basic building block of quantum computers, allowing them to perform certain types of calculations in ways that classical computers cannot.','Qubit'],
['Derived from a Latin word meaning "everywhere," this ten-letter adjective describes something that seems to be present or encountered in all places at once.','Ubiquitous']]),
category('Civ 5 Wonders',[
['Stretching thousands of miles across northern China, this massive defensive structure was built and rebuilt over centuries to protect Chinese states and empires from invasions.','The Great Wall of China'],
['Mughal emperor Shah Jahan commissioned this white marble mausoleum in the 17th century to honor his beloved wife, Mumtaz Mahal.','Taj Mahal'],
['This palace and fortress complex in Granada, Spain, was developed primarily under the Nasrid dynasty and is celebrated for its intricate geometric tilework, carved stucco, and elaborate courtyards.','Alhambra'],
['Built in the 15th century high in the Andes Mountains, this Incan citadel remained largely unknown to the outside world until American explorer Hiram Bingham brought it to international attention in 1911.','Machu Picchu'],
['Built in the ancient city of Ephesus, in modern-day Turkey, this monumental sanctuary was destroyed by an arsonist named Herostratus in 356 BCE, reportedly in an attempt to achieve everlasting fame.','The Temple of Artemis']]),
{...sample.boards[1][4],title:'Pixel Perfect'},
{title:'Bomb Defusal',teamBased:true,clues:bombs.map(puzzle=>({prompt:puzzle.message,answer:'',used:false,kind:'group',groupMode:'time',linkLabel:'Bomb defusal',puzzle}))}
]],final:{category:'',prompt:'',answer:''}});
if(content.boards.some(board=>board.length!==5||board.some(c=>c.clues.some(q=>!isClueReady(q)))))throw Error('Invalid clues');
writeFileSync('exports/jelley-qoobee-questions.json',JSON.stringify(content,null,2));
console.log('Validated 2 boards, 5 categories each, 50 ready clues. Embedded Duskull and five Pixel Perfect images. Final Jeopardy left blank.');
