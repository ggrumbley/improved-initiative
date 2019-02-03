interface Environment {
  EncounterId: string;
  PostedEncounter: { Combatants: any[] };
  IsLoggedIn: boolean;
  HasStorage: boolean;
  HasEpicInitiative: boolean;
  CanonicalURL: string;
  PatreonLoginUrl: string;
}

export const env: Environment = {
  EncounterId: null,
  CanonicalURL: null,
  PostedEncounter: null,
  HasStorage: false,
  HasEpicInitiative: false,
  IsLoggedIn: false,
  PatreonLoginUrl: "http://www.patreon.com/"
};

export function LoadEnvironment() {
  const html = document.getElementsByTagName("html")[0];

  env.EncounterId = html.getAttribute("encounterId");
  env.CanonicalURL = html.getAttribute("baseUrl");
  const encounterJSON = html.getAttribute("postedEncounter");
  if (encounterJSON) {
    env.PostedEncounter = JSON.parse(encounterJSON);
  }
  env.HasStorage = html.getAttribute("hasStorage") == "true";
  env.HasEpicInitiative = html.getAttribute("hasEpicInitiative") == "true";
  env.IsLoggedIn = html.getAttribute("isLoggedIn") == "true";
  if (window["patreonLoginUrl"]) {
    env.PatreonLoginUrl = window["patreonLoginUrl"];
  }
}
