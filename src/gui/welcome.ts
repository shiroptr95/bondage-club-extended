import { getPlayerCharacter } from "../characters";
import { setSubscreen } from "../modules/gui";
import { applyPreset } from "../modules/presets";
import { icon_OwnerList } from "../resources";
import { DrawImageEx } from "../utilsClub";
import { GuiMainMenu } from "./mainmenu";
import { GuiSubscreen } from "./subscreen";
import { GuiTutorial } from "./tutorial";
import { ChatroomCharacter } from "../characters";

export class GuiWelcomeSelection extends GuiSubscreen {

	readonly character: ChatroomCharacter;

	private selectedPreset: number = -1;

	constructor(character: ChatroomCharacter) {
		super();
		this.character = character;
	}

	Run() {
		MainCanvas.textAlign = "center";

		DrawButton(800, 66, 400, 54, "<< Back to the tutorial", "White");
		DrawText(`Please choose a preset, which sets your default experience, permissions and configuration.`, 1000, 150, "Black");
		DrawText(`Note: You can change the defaults, but changing to another preset is not possible without resetting BCX fully.`, 1000, 200, "FireBrick");

		const width = 400;
		const texts = ["Dominant", "Switch/Exploring", "Submissive", "Slave"];
		const images = ["Icons/Management.png", "Icons/Swap.png", "Icons/Kneel.png", icon_OwnerList];

		const descriptionDominant =
			`Пресет предназначен для доминантов, которые\n` +
			`никогда не собираются подчиняться. Поэтому,\n` +
			`большинство модулей не включены при\n` +
			`старте. Но, вы сможете использовать\n` +
			`интерфейс BCX на других пользователях\n` +
			`BCX, чтобы использовать действия,\n` +
			`на которые у вас есть разрешение,\n` +
			`на них, как и в других пресетах.`;

		const descriptionSwitch =
			`Этот пресет предназначен для тех,\n` +
			`кто иногда доминируют, а\n` +
			`иногда подчиняется, позволяя им\n` +
			`изучать BCX и при этом\n` +
			`иметь полный контроль над всеми его\n` +
			`настройками и возможностями.`;

		const descriptionSubmissive =
			`Пресет предназначен для сабмиссивов,\n` +
			`которые хотят отдать часть своего\n` +
			`контроля избранным доминантам и\n` +
			`любовникам, предоставив только им\n` +
			`власть над некоторыми настройками BCX.\n` +
			`Вы может необратимо отдать больше\n` +
			`контроля, когда захотите.`;

		const descriptionSlave =
			`Этот пресет - более экстремальный\n` +
			`вариант покорности,\n` +
			`не оставляющий вам контроля над\n` +
			`настройками и разрешениями,\n` +
			`позволяя другим использовать многие\n` +
			`функции BCX на вас. Владельцы могут\n` +
			`разблокировать самые экстремальные\n` +
			`настройки, если они того пожелают.`;

		const descriptions = [descriptionDominant, descriptionSwitch, descriptionSubmissive, descriptionSlave];

		for (let i = 0; i < 4; i++) {
			const X = 125 + i * (width + 50);
			if (MouseIn(X, 250, width, 575)) {
				DrawRect(X, 250, width, 575, "#ddd");
			}
			DrawEmptyRect(X, 250, width, 575, "Black");
			if (i === this.selectedPreset) {
				const border = 10;
				DrawEmptyRect(X - border, 250 - border, width + 2 * border, 575 + 2 * border, "Cyan", 5);
				DrawButton(X + 20, 850, width - 40, 65, "Confirm", "White");
			}
			DrawImageEx(images[i], X + width / 2 - 43, 275);
			DrawText(texts[i], X + width / 2, 400, "Black");
			MainCanvas.font = CommonGetFont(24);
			let texty = 475;
			for (const line of descriptions[i].split("\n")) {
				DrawText(line, X + width / 2, texty, "Black");
				texty += 36;
			}
			if (i === 1) {
				DrawText("Easily try out all features", X + width / 2, 775, "Black");
			} else if (i === 2) {
				DrawText("Similar to Ace's Cursed Script", X + width / 2, 775, "Black");
			}
			MainCanvas.font = CommonGetFont(36);
		}
	}

	Click() {

		const width = 400;

		for (let i = 0; i < 4; i++) {
			const X = 125 + i * (width + 50);
			if (MouseIn(X, 250, width, 575)) {
				this.selectedPreset = i;
				return;
			}
			if (i === this.selectedPreset && MouseIn(X + 20, 850, width - 40, 65)) {
				applyPreset(i);
				setSubscreen(new GuiMainMenu(getPlayerCharacter()));
			}
		}

		if (MouseIn(800, 66, 400, 54)) setSubscreen(new GuiTutorial(this.character, true));

	}

	Exit() {
		// Empty
	}
}
