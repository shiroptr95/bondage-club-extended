import { ChatroomCharacter } from "../characters";
import { GuiConditionGlobal } from "./conditions_global_base";
import { GuiSubscreen } from "./subscreen";
import { Views, HELP_TEXTS } from "../helpTexts";
import { showHelp } from "../utilsClub";

export class GuiConditionGlobalCurses extends GuiConditionGlobal<"curses"> {

	constructor(character: ChatroomCharacter,
		back: GuiSubscreen
	) {
		super(character, "curses", back);
	}

	protected override headerText(): string {
		return `Просмотр / редактирование глобальной конфигурации ${this.conditionCategory}`;
	}

	Run(): boolean {
		if (super.Run() || this.conditionCategoryData === null)
			return true;

		MainCanvas.textAlign = "left";
		DrawText(`Note: Settings are applied to new curses and all existing ones set to the global config.`, 130, 210, "Black", "");

		const data = this.changes ?? this.conditionCategoryData;
		const access = this.checkAccess();

		////// right side: special curse category options
		if (data.data) {
			DrawCheckbox(1050, 267, 64, 64, "Уберите предмет, когда проклят", data.data.itemRemove, !access);
			MainCanvas.save();
			MainCanvas.font = CommonGetFont(28);
			DrawText("становится неактивным, удаляется или больше не срабатывает", 1152, 347, "Black");
			DrawText("- не удаляет заблокированные элементы", 1152, 387, "Black");
			MainCanvas.restore();
		}

		// help text
		if (this.showHelp) {
			showHelp(HELP_TEXTS[Views.ConditionsGlobalCurses]);
		}

		return false;
	}

	Click(): boolean {
		if (super.Click() || this.conditionCategoryData === null)
			return true;

		if (!this.checkAccess())
			return false;

		const data = this.changes ?? this.conditionCategoryData;

		if (MouseIn(1050, 267, 64, 64) && data.data) {
			this.changes = this.makeChangesData();
			this.changes.data!.itemRemove = !this.changes.data!.itemRemove;
			return true;
		}

		return false;
	}
}
