import { ChatroomCharacter } from "../characters";
import { curseAllowItemCurseProperty, curseDefaultItemCurseProperty } from "../modules/curses";
import { getVisibleGroupName, showHelp } from "../utilsClub";
import { GuiConditionEdit } from "./conditions_edit_base";
import { GuiSubscreen } from "./subscreen";
import { Views, HELP_TEXTS } from "../helpTexts";

import cloneDeep from "lodash-es/cloneDeep";

export class GuiConditionEditCurses extends GuiConditionEdit<"curses"> {

	private item: Asset | null = null;
	private allowSettingsCurse: boolean = false;

	constructor(character: ChatroomCharacter,
		conditionName: ConditionsCategoryKeys["curses"],
		back: GuiSubscreen
	) {
		super(character, "curses", conditionName, back);
	}

	protected override headerText(): string {
		const group = AssetGroup.find(i => i.Name === this.conditionName);
		return `View / Edit the '${group ? getVisibleGroupName(group) : "[ERROR]"}' curse`;
	}

	protected override setUseGlobal(useGlobal: boolean) {
		super.setUseGlobal(useGlobal);

		if (!this.changes || !this.conditionData || !this.conditionCategoryData)
			return;

		if (this.changes?.data) {
			this.changes.data.itemRemove = useGlobal ? false : this.conditionCategoryData.data.itemRemove;
		}
	}

	protected override onDataChange() {
		super.onDataChange();

		if (!this.conditionCategoryData || !this.conditionData) {
			return;
		}

		if (this.conditionData.data) {
			this.item = AssetGet(this.character.Character.AssetFamily, this.conditionName, this.conditionData.data.Name);
			this.allowSettingsCurse = this.conditionData.data.curseProperties || !this.item || curseAllowItemCurseProperty(this.item);
		} else {
			this.item = null;
			this.allowSettingsCurse = false;
		}

		if (this.changes && this.changes.data?.Name !== this.conditionData.data?.Name) {
			this.changes.data = cloneDeep(this.conditionData.data);
		}
	}

	Run(): boolean {
		if (super.Run() || this.conditionCategoryData === null || this.conditionData === null)
			return true;

		const data = this.changes ?? this.conditionData;
		const useGlobalCategorySetting = !data.requirements;
		const itemRemove = !!(useGlobalCategorySetting ? this.conditionCategoryData.data.itemRemove : data.data?.itemRemove);
		const access = this.checkAccess();

		MainCanvas.textAlign = "left";

		////// right side: special curse category options
		if (data.data) {
			if (useGlobalCategorySetting) {
				DrawRect(1045, 100, 74, 74, "#0052A3");
			}
			DrawCheckbox(1050, 105, 64, 64, "Уберите предмет, когда проклятие", itemRemove, !access || useGlobalCategorySetting);
			MainCanvas.save();
			MainCanvas.font = CommonGetFont(28);
			DrawText("becomes inactive, removed, or is no longer", 1152, 185, "Black");
			DrawText("triggering - does not remove locked items", 1152, 225, "Black");
			MainCanvas.restore();
		}
		if (this.allowSettingsCurse && data.data) {
			DrawCheckbox(1050, 265, 64, 64, "Также проклинайте конфигурацию предмета", data.data.curseProperties, !access);
			MainCanvas.save();
			MainCanvas.font = CommonGetFont(28);
			DrawText(`Пример: какая веревочная стяжка используется`, 1151, 347, "Black", "");
			MainCanvas.restore();
			if (this.item && !curseDefaultItemCurseProperty(this.item)) {
				MainCanvas.save();
				MainCanvas.font = CommonGetFont(30);
				DrawTextWrap(
					"Предупреждение: этот элемент не стандартизирован, и некоторые или все его состояния конфигурации могут вести себя неожиданным образом. " +
					"если они прокляты вышеуказанным флажком. Предположим, что большинство из них не будут работать корректно. " +
					"Проблемы могут варьироваться от возрождения с другой конфигурацией до постоянного случайного срабатывания проклятия. " +
					"Поскольку некоторые из этих элементов работают (частично), возможность проклясть конфигурацию по-прежнему предлагается.",
					1051 - 860 / 2, 365, 860, 400, "FireBrick");
				MainCanvas.restore();
			}
		}

		// help text
		if (this.showHelp) {
			showHelp(HELP_TEXTS[Views.ConditionsEditCurses]);
		}

		return false;
	}

	Click(): boolean {
		if (super.Click() || this.conditionCategoryData === null || this.conditionData === null)
			return true;

		if (!this.checkAccess())
			return false;

		const data = this.changes ?? this.conditionData;
		const useGlobalCategorySetting = !(this.changes ? this.changes.requirements : data.requirements);

		if (MouseIn(1050, 105, 64, 64) && data.data && !useGlobalCategorySetting) {
			this.changes = this.makeChangesData();
			this.changes.data!.itemRemove = !this.changes.data!.itemRemove;
			return true;
		}

		if (MouseIn(1050, 265, 64, 64) && this.allowSettingsCurse && data.data) {
			this.changes = this.makeChangesData();
			this.changes.data!.curseProperties = !this.changes.data!.curseProperties;
			return true;
		}

		return false;
	}
}
