import * as Color from "color";
import * as ko from "knockout";

import { EncounterState } from "../common/EncounterState";
import { PlayerView } from "../common/PlayerView";
import {
  PlayerViewCustomStyles,
  PlayerViewSettings
} from "../common/PlayerViewSettings";
import { StaticCombatantViewModel } from "./Combatant/StaticCombatantViewModel";
import { env } from "./Environment";
import { CombatantSuggestor } from "./Player/CombatantSuggestor";
import { TurnTimer } from "./Widgets/TurnTimer";

export interface ImageModalState {
  Visible: boolean;
  URL: string;
  Caption: string;
  Timeout: any;
  BlockAutoModal: boolean;
}

export class PlayerViewModel {
  public additionalUserCSS: HTMLStyleElement;
  public userStyles: HTMLStyleElement;
  public combatants: KnockoutObservableArray<
    StaticCombatantViewModel
  > = ko.observableArray<StaticCombatantViewModel>([]);
  public activeCombatantId = ko.observable<string>(null);
  public encounterId = env.EncounterId;
  public roundCounter = ko.observable();
  public roundCounterVisible = ko.observable(false);
  public turnTimer = new TurnTimer();
  public turnTimerVisible = ko.observable(false);
  public allowSuggestions = ko.observable(false);
  public activeCombatantOnTop = ko.observable(false);
  public displayPortraits = ko.observable(false);
  public splashPortraits = false;

  public imageModal = ko.observable<ImageModalState>({
    Visible: false,
    URL: "",
    Caption: "",
    Timeout: null,
    BlockAutoModal: false
  });

  protected hasImages = ko.computed(() => {
    const displayPortraits = this.displayPortraits();
    const combatants = this.combatants();

    return displayPortraits && combatants.some(c => c.ImageURL.length > 0);
  });

  private combatantSuggestor = new CombatantSuggestor(
    this.socket,
    this.encounterId
  );

  constructor(private socket: SocketIOClient.Socket) {
    this.socket.on(
      "encounter updated",
      (encounter: EncounterState<StaticCombatantViewModel>) => {
        this.LoadEncounter(encounter);
      }
    );
    this.socket.on("settings updated", (settings: PlayerViewSettings) => {
      this.LoadSettings(settings);
    });

    this.socket.emit("join encounter", this.encounterId);

    this.InitializeStylesheets();
  }

  public LoadEncounterFromServer = (encounterId: string) => {
    $.ajax(`../playerviews/${encounterId}`).done((playerView: PlayerView) => {
      if (!playerView) {
        return;
      }

      if (playerView.encounterState) {
        this.LoadEncounter(playerView.encounterState);
      }

      if (playerView.settings) {
        this.LoadSettings(playerView.settings);
      }
    });
  };

  private InitializeStylesheets() {
    const userStylesElement = document.createElement("style");
    const additionalCSSElement = document.createElement("style");
    userStylesElement.type = "text/css";
    additionalCSSElement.type = "text/css";
    const headElement = document.getElementsByTagName("head")[0];
    this.userStyles = headElement.appendChild(userStylesElement);
    this.additionalUserCSS = headElement.appendChild(additionalCSSElement);
  }

  public LoadSettings(settings: PlayerViewSettings) {
    this.userStyles.innerHTML = CSSFrom(settings.CustomStyles);
    this.additionalUserCSS.innerHTML = settings.CustomCSS;
    this.allowSuggestions(settings.AllowPlayerSuggestions);
    this.activeCombatantOnTop(settings.ActiveCombatantOnTop);
    this.turnTimerVisible(settings.DisplayTurnTimer);
    this.roundCounterVisible(settings.DisplayRoundCounter);
    this.displayPortraits(settings.DisplayPortraits);
    this.splashPortraits = settings.SplashPortraits;
  }

  public LoadEncounter = (
    encounter: EncounterState<StaticCombatantViewModel>
  ) => {
    this.combatants(encounter.Combatants);
    this.roundCounter(encounter.RoundCounter);
    if (!encounter.ActiveCombatantId) {
      this.turnTimer.Stop();
      return;
    }
    const newCombatantTurn =
      !this.activeCombatantId() ||
      encounter.ActiveCombatantId != this.activeCombatantId();
    if (newCombatantTurn) {
      this.turnTimer.Start();
      this.turnTimer.Reset();
      this.activeCombatantId(encounter.ActiveCombatantId);
      setTimeout(this.ScrollToActiveCombatant, 1);
      if (this.splashPortraits && !this.imageModal().BlockAutoModal) {
        this.SplashPortrait(encounter.ActiveCombatantId, false);
        this.imageModal({
          ...this.imageModal(),
          Timeout: setTimeout(this.CloseImageModal, 5000)
        });
      }
    }
  };

  private ScrollToActiveCombatant = () => {
    const activeCombatantElement = document.getElementsByClassName("active")[0];
    if (activeCombatantElement) {
      activeCombatantElement.scrollIntoView(false);
    }
  };

  protected ShowSuggestion = (combatant: StaticCombatantViewModel) => {
    if (!this.allowSuggestions()) {
      return;
    }
    this.combatantSuggestor.Show(combatant);
  };

  private SplashPortrait = (SelectedId: string, didClick: boolean) => {
    const imageModal = this.imageModal();
    const combatant = this.combatants()
      .filter(c => c.Id == SelectedId)
      .pop();
    if (!combatant || !combatant.ImageURL.length) {
      return;
    }
    if (didClick) {
      imageModal.BlockAutoModal = true;
      imageModal.Caption = "";
    } else {
      imageModal.Caption = "<p>Start of Turn:</p>";
    }

    const tagsCaption = combatant.Tags.map(t => t.Text).join(" ");
    imageModal.Caption += `<p>${combatant.Name} (${
      combatant.HPDisplay
    }) ${tagsCaption}</p>`;

    imageModal.URL = combatant.ImageURL;
    imageModal.Visible = true;

    this.imageModal(imageModal);
  };

  private CloseImageModal = () => {
    const imageModal = this.imageModal();
    imageModal.Visible = false;
    imageModal.BlockAutoModal = false;
    clearTimeout(imageModal.Timeout);
    this.imageModal(imageModal);
  };
}

function CSSFrom(customStyles: PlayerViewCustomStyles): string {
  const declarations = [];

  if (customStyles.combatantText) {
    declarations.push(`li.combatant { color: ${customStyles.combatantText}; }`);
  }

  if (customStyles.combatantBackground) {
    const baseColor = Color(customStyles.combatantBackground);
    let zebraColor = "",
      activeColor = "";
    if (baseColor.isDark()) {
      zebraColor = baseColor.lighten(0.1).string();
      activeColor = baseColor.lighten(0.2).string();
    } else {
      zebraColor = baseColor.darken(0.1).string();
      activeColor = baseColor.darken(0.2).string();
    }
    declarations.push(
      `.combatant { background-color: ${customStyles.combatantBackground}; }`
    );
    declarations.push(
      `.combatant:nth-child(2n-1) { background-color: ${zebraColor}; }`
    );
    declarations.push(
      `.combatant.active { background-color: ${activeColor}; }`
    );
  }

  if (customStyles.activeCombatantIndicator) {
    declarations.push(
      `.combatant.active { border-color: ${
        customStyles.activeCombatantIndicator
      } }`
    );
  }

  if (customStyles.headerText) {
    declarations.push(
      `.combatant--header, .combat-footer { color: ${
        customStyles.headerText
      }; }`
    );
  }

  if (customStyles.headerBackground) {
    declarations.push(
      `.combatant--header, .combat-footer { background-color: ${
        customStyles.headerBackground
      }; border-color: ${customStyles.headerBackground} }`
    );
  }

  if (customStyles.mainBackground) {
    declarations.push(
      `#playerview { background-color: ${customStyles.mainBackground}; }`
    );
    if (!customStyles.backgroundUrl) {
      declarations.push(`#playerview { background-image: none; }`);
    }
  }

  if (customStyles.backgroundUrl) {
    declarations.push(
      `#playerview { background-image: url(${customStyles.backgroundUrl}); }`
    );
  }

  if (customStyles.font) {
    declarations.push(`* { font-family: "${customStyles.font}", sans-serif; }`);
  }

  return declarations.join(" ");
}
