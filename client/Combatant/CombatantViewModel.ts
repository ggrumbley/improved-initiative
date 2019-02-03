import * as ko from "knockout";
import * as _ from "lodash";

import { toModifierString } from "../../common/Toolbox";
import { CombatantCommander } from "../Commands/CombatantCommander";
import { ConcentrationPrompt } from "../Commands/Prompts/ConcentrationPrompt";
import { DefaultPrompt, Prompt } from "../Commands/Prompts/Prompt";
import { Conditions } from "../Rules/Conditions";
import { CurrentSettings } from "../Settings/Settings";
import { Metrics } from "../Utility/Metrics";
import { Combatant } from "./Combatant";
import { Tag } from "./Tag";

export class CombatantViewModel {
  public HP: KnockoutComputed<string>;
  public Name: KnockoutComputed<string>;
  public IsNew = ko.observable(true);

  constructor(
    public Combatant: Combatant,
    public CombatantCommander: CombatantCommander,
    public PromptUser: (prompt: Prompt) => void,
    public LogEvent: (message: string) => void
  ) {
    this.HP = ko.pureComputed(() => {
      if (this.Combatant.TemporaryHP()) {
        return `${this.Combatant.CurrentHP()}+${this.Combatant.TemporaryHP()}/${this.Combatant.MaxHP()}`;
      } else {
        return `${this.Combatant.CurrentHP()}/${this.Combatant.MaxHP()}`;
      }
    });
    this.Name = Combatant.DisplayName;
    setTimeout(() => this.IsNew(false), 500);
  }

  public ApplyDamage(inputDamage: string) {
    let damage = parseInt(inputDamage),
      healing = -damage,
      autoCheckConcentration = CurrentSettings().Rules.AutoCheckConcentration;

    if (isNaN(damage)) {
      return;
    }

    if (damage > 0) {
      Metrics.TrackEvent("DamageApplied", { Amount: damage.toString() });
      if (
        autoCheckConcentration &&
        this.Combatant.Tags().some(t => t.Text === ConcentrationPrompt.Tag)
      ) {
        this.CombatantCommander.CheckConcentration(this.Combatant, damage);
      }
      this.Combatant.ApplyDamage(damage);
    } else {
      this.Combatant.ApplyHealing(healing);
    }
  }

  public ApplyTemporaryHP(inputTHP: string) {
    let newTemporaryHP = parseInt(inputTHP);

    if (isNaN(newTemporaryHP)) {
      return;
    }

    this.Combatant.ApplyTemporaryHP(newTemporaryHP);
  }

  public ApplyInitiative(inputInitiative: string) {
    const initiative = parseInt(inputInitiative);
    this.Combatant.Initiative(initiative);
    this.Combatant.Encounter.SortByInitiative(true);
  }

  public InitiativeClass = ko.computed(() => {
    if (this.Combatant.InitiativeGroup()) {
      return "fas fa-link";
    }
  });

  public GetHPColor() {
    const maxHP = this.Combatant.MaxHP(),
      currentHP = this.Combatant.CurrentHP();
    let green = Math.floor((currentHP / maxHP) * 170);
    let red = Math.floor(((maxHP - currentHP) / maxHP) * 170);
    return "rgb(" + red + "," + green + ",0)";
  }

  public EditHP() {
    this.CombatantCommander.EditSingleCombatantHP(this);
  }

  public EditInitiative() {
    const currentInitiative = this.Combatant.Initiative();
    const modifier = toModifierString(this.Combatant.InitiativeBonus);
    let preRoll = currentInitiative || this.Combatant.GetInitiativeRoll();
    let message = `Set initiative for ${this.Name()} (${modifier}): <input id='initiative' class='response' type='number' value='${preRoll}' />`;
    if (this.Combatant.InitiativeGroup()) {
      message += ` Break Link: <input name='break-link' type='checkbox' value='break' />`;
    }
    const prompt = new DefaultPrompt(message, response => {
      const initiative = response["initiative"];
      const breakLink = response["break-link"] === "break";
      if (initiative) {
        if (breakLink) {
          this.Combatant.InitiativeGroup(null);
          this.Combatant.Encounter.CleanInitiativeGroups();
        }
        this.ApplyInitiative(initiative);
        this.LogEvent(`${this.Name()} initiative set to ${initiative}.`);
        Metrics.TrackEvent("InitiativeSet", { Name: this.Name() });
        this.Combatant.Encounter.QueueEmitEncounter();
      }
    });
    this.PromptUser(prompt);
  }

  public SetAlias() {
    let currentName = this.Name();
    const prompt = new DefaultPrompt(
      `Change alias for ${currentName}: <input id='alias' class='response' />`,
      response => {
        const alias = response["alias"];
        this.Combatant.Alias(alias);
        if (alias) {
          this.LogEvent(`${currentName} alias changed to ${alias}.`);
        } else {
          this.LogEvent(`${currentName} alias removed.`);
        }

        this.Combatant.Encounter.QueueEmitEncounter();
      }
    );
    this.PromptUser(prompt);
  }

  public HiddenClass = ko.pureComputed(() => {
    return this.Combatant.Hidden() ? "fa-eye-slash" : "fa-eye";
  });

  public IsSelected = ko.pureComputed(() => {
    return this.CombatantCommander.SelectedCombatants().some(c => c === this);
  });

  public IsActive = ko.pureComputed(() => {
    const activeCombatant = this.Combatant.Encounter.ActiveCombatant();
    return this.Combatant === activeCombatant;
  });

  public ToggleHidden() {
    if (this.Combatant.Hidden()) {
      this.Combatant.Hidden(false);
      this.LogEvent(`${this.Name()} revealed in player view.`);
    } else {
      this.Combatant.Hidden(true);
      this.LogEvent(`${this.Name()} hidden in player view.`);
    }
    this.Combatant.Encounter.QueueEmitEncounter();
  }

  public RemoveTag = (tag: Tag) => {
    this.Combatant.Tags.splice(this.Combatant.Tags.indexOf(tag), 1);
    this.LogEvent(`${this.Name()} removed tag: "${tag.Text}"`);
    this.Combatant.Encounter.QueueEmitEncounter();
  };

  public ReferenceTaggedCondition = (tag: Tag) => {
    const casedConditionName = _.startCase(tag.Text);
    if (Conditions[casedConditionName]) {
      const prompt = new DefaultPrompt(
        `<div class="p-condition-reference"><h3>${casedConditionName}</h3>${
          Conditions[casedConditionName]
        }</div>`
      );
      this.PromptUser(prompt);
    }
  };

  public TagHasReference = (tag: Tag) => {
    const casedConditionName = _.startCase(tag.Text);
    return Conditions[casedConditionName] !== undefined;
  };
}
