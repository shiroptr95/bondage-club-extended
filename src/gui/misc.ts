import { ChatroomCharacter } from "../characters";
import { MiscCheat } from "../constants";
import { setSubscreen } from "../modules/gui";
import { cheatIsEnabled, cheatToggle } from "../modules/miscPatches";
import { modStorage, modStorageSync } from "../modules/storage";
import { GuiMainMenu } from "./mainmenu";
import { GuiSubscreen } from "./subscreen";
import { Views, HELP_TEXTS } from "../helpTexts";
import { showHelp } from "../utilsClub";
import { announceSelf } from "../modules/chatroom";
import { clampWrap } from "../utils";

const GUI_MISC_PAGES = 2;

export class GuiMisc extends GuiSubscreen {

	readonly character: ChatroomCharacter;

	private showHelp: boolean = false;

	private page = 0;

	constructor(character: ChatroomCharacter) {
		super();
		this.character = character;
	}

	Load() {
		this.setPage(0);
		if (this.character.isPlayer()) {
			ElementCreateInput("BCX_RoomSearchValueField", "text", modStorage.roomSearchAutoFill || "", "20");
		}
	}

	private setPage(page: number) {
		this.page = page;
		const roomSearchValueField = document.getElementById("BCX_RoomSearchValueField") as HTMLInputElement | undefined;
		if (roomSearchValueField) {
			roomSearchValueField.style.display = (this.page === 0 && this.character.isPlayer()) ? "" : "none";
		}
	}

	Run() {
		MainCanvas.textAlign = "left";
		DrawText(`- Miscellaneous: Configuration for ${this.character.Name} -`, 125, 125, "Black", "Gray");

		MainCanvas.textAlign = "center";
		DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png", "Главное меню BCX");
		if (this.character.isPlayer()) {
			DrawButton(1815, 190, 90, 90, "", "White", "Icons/Question.png");
		}

		DrawBackNextButton(1600, 820, 300, 90, `Page ${this.page + 1} / ${GUI_MISC_PAGES}`, "White", "", () => "", () => "");

		if (!this.character.isPlayer()) {
			DrawText(`Miscellaneous module configuration is not possible on others`, 1000, 500, "Black");
			return;
		}

		MainCanvas.textAlign = "left";

		if (this.page === 0) {
			DrawCheckbox(125, 200, 64, 64, "Включить индикатор набора текста", !!modStorage.typingIndicatorEnable);
			DrawCheckbox(700, 200, 64, 64, "Скрыть значок набора текста и гардероба BC у пользователей, показывающих BCX one", !!modStorage.typingIndicatorHideBC);
			DrawCheckbox(125, 300, 64, 64, "Включить индикатор статуса, показывающий, когда вы находитесь в меню, биографии или гардеробе BCX любого игрока.", !!modStorage.screenIndicatorEnable);
			DrawCheckbox(125, 400, 64, 64, "Чит: предотвращение случайных событий NPC (похищения людей, выкупы, убежище, клубные рабы)", cheatIsEnabled(MiscCheat.BlockRandomEvents));
			DrawCheckbox(125, 500, 64, 64, "Чит: предотвращение потери статуса Госпожи, когда репутация падает ниже 50 доминирования.", cheatIsEnabled(MiscCheat.CantLoseMistress));
			DrawCheckbox(125, 600, 64, 64, "Чит: дайте себе замок хозяйки и ключ от него.", cheatIsEnabled(MiscCheat.GiveMistressKey));
			DrawCheckbox(125, 700, 64, 64, "Чит: дайте себе замок Пандоры и ключ от него.", cheatIsEnabled(MiscCheat.GivePandoraKey));
			DrawText("текст для автоматического заполнения поля поиска чата:", 125, 830, "Black", "Gray");
			ElementPosition("BCX_RoomSearchValueField", 1320, 827, 460, 64);
		} else if (this.page === 1) {
			DrawCheckbox(125, 200, 64, 64, "Используйте расширенный импортер гардероба по умолчанию.", modStorage.wardrobeDefaultExtended ?? true);
		}

		// help text
		if (this.showHelp) {
			showHelp(HELP_TEXTS[Views.Misc]);
		}
	}

	Click() {
		if (MouseIn(1815, 75, 90, 90)) return this.Exit();
		if (MouseIn(1815, 190, 90, 90) && this.character.isPlayer()) {
			this.showHelp = !this.showHelp;
			return;
		}

		if (!this.character.isPlayer())
			return;

		if (MouseIn(1600, 820, 150, 90)) {
			this.setPage(clampWrap(this.page - 1, 0, GUI_MISC_PAGES - 1));
		} else if (MouseIn(1750, 820, 150, 90)) {
			this.setPage(clampWrap(this.page + 1, 0, GUI_MISC_PAGES - 1));
		}

		if (this.page === 0) {
			if (MouseIn(125, 200, 64, 64)) {
				modStorage.typingIndicatorEnable = !modStorage.typingIndicatorEnable;
				modStorageSync();
				announceSelf();
			}
			if (MouseIn(700, 200, 64, 64)) {
				modStorage.typingIndicatorHideBC = !modStorage.typingIndicatorHideBC;
				modStorageSync();
			}

			if (MouseIn(125, 300, 64, 64)) {
				modStorage.screenIndicatorEnable = !modStorage.screenIndicatorEnable;
				modStorageSync();
				announceSelf();
			}

			if (MouseIn(125, 400, 64, 64)) {
				cheatToggle(MiscCheat.BlockRandomEvents);
			}

			if (MouseIn(125, 500, 64, 64)) {
				cheatToggle(MiscCheat.CantLoseMistress);
			}

			if (MouseIn(125, 600, 64, 64)) {
				cheatToggle(MiscCheat.GiveMistressKey);
			}

			if (MouseIn(125, 700, 64, 64)) {
				cheatToggle(MiscCheat.GivePandoraKey);
			}

		} else if (this.page === 1) {
			if (MouseIn(125, 200, 64, 64)) {
				modStorage.wardrobeDefaultExtended = !modStorage.wardrobeDefaultExtended;
				modStorageSync();
			}
		}

	}

	Exit() {
		const field = document.getElementById("BCX_RoomSearchValueField") as HTMLInputElement | undefined;
		if (field) {
			if (field.value) {
				modStorage.roomSearchAutoFill = field.value;
			} else {
				delete modStorage.roomSearchAutoFill;
			}
			modStorageSync();
		}
		setSubscreen(new GuiMainMenu(this.character));
	}

	Unload() {
		ElementRemove("BCX_RoomSearchValueField");
	}
}
