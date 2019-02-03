import { Spell } from "../../common/Spell";
import { StatBlock } from "../../common/StatBlock";
import { SpellImporter } from "./SpellImporter";
import { StatBlockImporter } from "./StatBlockImporter";

const getStatBlocksFromXml = (xmlString: string) => {
  const statBlocks = $(xmlString)
    .find("monster")
    .toArray();
  return statBlocks.map(xmlDoc => {
    let importer = new StatBlockImporter(xmlDoc);
    return importer.GetStatBlock();
  });
};

const getSpellsFromXml = (xmlString: string) => {
  const spells = $(xmlString)
    .find("spell")
    .toArray();
  return spells.map(xmlDoc => {
    let importer = new SpellImporter(xmlDoc);
    return importer.GetSpell();
  });
};

export class DnDAppFilesImporter {
  public ImportEntitiesFromXml = (
    xmlFile: File,
    statBlocksCallback: (statBlocks: StatBlock[]) => void,
    spellsCallback: (spells: Spell[]) => void
  ) => {
    const reader = new FileReader();

    reader.onload = (event: any) => {
      const xml: string = event.target.result;
      const statBlocks = getStatBlocksFromXml(xml);
      const spells = getSpellsFromXml(xml);

      if (statBlocks.length) {
        statBlocksCallback(statBlocks);
      }

      if (spells.length) {
        spellsCallback(spells);
      }

      if (spells.length || statBlocks.length) {
        location.reload();
      } else {
        alert(
          `Could not retrieve any statblocks or spells from ${
            xmlFile.name
          }. Please ensure that a valid DnDAppFile XML file is used.`
        );
      }
    };

    reader.readAsText(xmlFile);
  };
}
