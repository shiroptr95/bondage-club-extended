import { ChatroomCharacter } from "../characters";
import { GuiConditionGlobal } from "./conditions_global_base";
import { GuiSubscreen } from "./subscreen";
import { Views, HELP_TEXTS } from "../helpTexts";
import { showHelp } from "../utilsClub";

export class GuiConditionGlobalRules extends GuiConditionGlobal<"rules"> {

	constructor(character: ChatroomCharacter,
		back: GuiSubscreen
	) {
		super(character, "rules", back);
	}

	protected override headerText(): string {
		return `Просмотр / редактирование глобальной конфигурации ${this.conditionCategory}`;
	}

	Run(): boolean {
		if (super.Run() || this.conditionCategoryData === null)
			return true;

		MainCanvas.textAlign = "left";
		DrawText(`Применяется к новым правилам и ко всем существующим, установленным в глобальную конфигурацию.`, 130, 210, "Black", "");

		// help text
		if (this.showHelp) {
			showHelp(HELP_TEXTS[Views.ConditionsGlobalRules]);
		}

		return false;
	}

	Click(): boolean {
		if (super.Click() || this.conditionCategoryData === null)
			return true;

		return false;
	}
}
