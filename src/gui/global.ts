import { ChatroomCharacter } from "../characters";
import { setSubscreen } from "../modules/gui";
import { GuiGlobalDialogClearData } from "./global_dialogClearData";
import { GuiMainMenu } from "./mainmenu";
import { GuiGlobalModuleToggling } from "./global_moduleToggling";
import { GuiSubscreen } from "./subscreen";
import { capitalizeFirstLetter } from "../utils";
import { DrawImageEx } from "../utilsClub";
import { getCurrentPreset } from "../modules/presets";
import { Preset } from "../constants";
import { modStorage, modStorageSync } from "../modules/storage";
import { setSupporterVisible, supporterStatus } from "../modules/versionCheck";

export class GuiGlobal extends GuiSubscreen {

	readonly character: ChatroomCharacter;

	constructor(character: ChatroomCharacter) {
		super();
		this.character = character;
	}

	Run() {
		MainCanvas.textAlign = "left";
		DrawText(`- Global: Конфигурация для ${this.character.Name} -`, 125, 125, "Black", "Gray");

		MainCanvas.textAlign = "center";
		DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Главное меню BCX");

		if (!this.character.isPlayer()) {
			DrawText(`Глобальная настройка невозможна на других устройствах.`, 1000, 500, "Black");
			return;
		}

		// preset
		DrawRect(840, 200, 950, 90, "#ddd");
		DrawImageEx("Icons/Introduction.png", 840 + 20, 200 + 20, { Height: 50, Width: 50 });
		DrawTextFit(`Первоначально выбрана предустановка BCX: "${capitalizeFirstLetter(Preset[getCurrentPreset()])}"`, 1300, 244, 850, "Black");

		// Manage modules
		DrawButton(120, 200, 400, 90, "Управление модулями BCX", "White", "", "Enable/Disable individual modules");

		// Emergency reset
		DrawButton(1490, 800, 300, 90, "Очистить все данные BCX", "#FF3232", "", "Emergency reset of BCX");

		// Icon toggles
		MainCanvas.textAlign = "left";
		DrawCheckbox(125, 350, 64, 64, "Показывать значки BCX над персонажами в чате", !modStorage.chatroomIconHidden);
		const isSupporter = supporterStatus !== undefined;
		DrawCheckbox(125, 450, 64, 64, "Покажите свое сердце участника BCX всем пользователям BCX", isSupporter && !modStorage.supporterHidden, !isSupporter);
	}

	Click() {
		if (MouseIn(1815, 75, 90, 90)) return this.Exit();

		if (!this.character.isPlayer())
			return;

		if (MouseIn(120, 200, 400, 90)) {
			setSubscreen(new GuiGlobalModuleToggling());
			return;
		}

		if (MouseIn(1490, 800, 300, 90)) {
			setSubscreen(new GuiGlobalDialogClearData(this));
			return;
		}

		// Icon toggles

		// Chatroom icon toggle
		if (MouseIn(125, 350, 64, 64)) {
			if (modStorage.chatroomIconHidden != null) {
				delete modStorage.chatroomIconHidden;
			} else {
				modStorage.chatroomIconHidden = true;
			}
			modStorageSync();
			return;
		}

		// BCX Supporter Heart toggle
		const isSupporter = supporterStatus !== undefined;
		if (isSupporter && MouseIn(125, 450, 64, 64)) {
			setSupporterVisible(!!modStorage.supporterHidden);
			return;
		}
	}

	Exit() {
		setSubscreen(new GuiMainMenu(this.character));
	}
}
