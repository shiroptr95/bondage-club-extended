import { ChatroomCharacter } from "../characters";
import { GuiSubscreen } from "./subscreen";
import { AccessLevel, getPermissionMinDisplayText, PermissionInfo } from "../modules/authority";
import { capitalizeFirstLetter } from "../utils";
import { setSubscreen } from "../modules/gui";

export class GuiAuthorityDialogMin extends GuiSubscreen {

	readonly character: ChatroomCharacter;
	readonly permission: BCX_Permissions;
	private permissionData: PermissionInfo;
	private myAccessLevel: AccessLevel;
	private noAccess: boolean;

	private selectedLevel: AccessLevel;

	public back: GuiSubscreen;

	constructor(character: ChatroomCharacter, permission: BCX_Permissions, data: PermissionInfo, myAccesLevel: AccessLevel, noAccess: boolean, back: GuiSubscreen) {
		super();
		this.character = character;
		this.permission = permission;
		this.permissionData = data;
		this.back = back;
		this.myAccessLevel = myAccesLevel;
		this.noAccess = noAccess;

		this.selectedLevel = data.min;
	}

	Run() {

		DrawTextFit(`- Authority: Changing minimum access to permission "${this.permissionData.name}" -`, 125, 125, 1850, "Black", "Gray");
		MainCanvas.textAlign = "center";

		DrawText("Выберите новую низшую роль, которая должна иметь это разрешение.", 1000, 255, "Black");
		DrawTextFit(`Информация: В настоящее время установлена роль: ${this.permissionData.min === AccessLevel.self ?
			this.character.Name : capitalizeFirstLetter(AccessLevel[this.permissionData.min])} → ` +
			`Недавно выбранная роль: ${this.selectedLevel === AccessLevel.self ?
				this.character.Name : capitalizeFirstLetter(AccessLevel[this.selectedLevel])}`, 1000, 320, 1850, "Black");
		DrawText("Все роли, расположенные слева от выбранной, также автоматически получат доступ.", 1000, 385, "Black");

		if (this.myAccessLevel === AccessLevel.self) {
			const available = (this.permissionData.min <= AccessLevel.self) || !this.noAccess;
			DrawButton(1000 - 110, 460, 220, 72, getPermissionMinDisplayText(AccessLevel.self, this.character), this.selectedLevel === AccessLevel.self ? "Cyan" : available ? "White" : "#ddd", undefined, undefined, !available);
		}

		for (let i = 1; i < 8; i++) {
			const current = this.selectedLevel === i;
			const available =
				(this.myAccessLevel === AccessLevel.self && this.permissionData.min <= i && i <= AccessLevel.owner) ||
				!this.noAccess && this.myAccessLevel <= i;
			DrawButton(-15 + 230 * i, 577, 190, 72, getPermissionMinDisplayText(i, this.character), current ? "Cyan" : available ? "White" : "#ddd", undefined, undefined, !available);
			if (i < 7)
				DrawText(">", 196 + 230 * i, 577 + 36, "Black");
		}

		if (this.character.isPlayer() && this.permission === "authority_revoke_self" && this.selectedLevel !== AccessLevel.self) {
			DrawText(`ПРЕДУПРЕЖДЕНИЕ: Если вы подтвердите, все разрешенные роли смогут удалить ваш доступ к этому и всем другим разрешениям!`, 1000, 730, "Red", "Gray");
		}

		DrawButton(700, 800, 200, 80, "Confirm", "White");

		DrawButton(1120, 800, 200, 80, "Cancel", "White");
	}

	Click() {
		if (MouseIn(700, 800, 200, 80)) return this.Confirm();
		if (MouseIn(1120, 800, 200, 80)) return this.Exit();

		if (MouseIn(1000 - 110, 460, 220, 72) && this.myAccessLevel === AccessLevel.self) {
			const available = (this.permissionData.min <= AccessLevel.self) || !this.noAccess;
			if (available) {
				this.selectedLevel = AccessLevel.self;
			}
		}

		for (let i = 1; i < 8; i++) {
			const current = this.selectedLevel === i;
			const available =
				(this.myAccessLevel === AccessLevel.self && this.permissionData.min <= i && i <= AccessLevel.owner) ||
				!this.noAccess && this.myAccessLevel <= i;
			if (MouseIn(-15 + 230 * i, 577, 190, 72) && !current && available) {
				this.selectedLevel = i;
			}
		}

	}

	Confirm() {
		this.character.setPermission(this.permission, "min", this.selectedLevel);
	}

	Exit() {
		setSubscreen(this.back);
	}

	onChange() {
		// When something changes, we bail from change dialog, because it might no longer be valid
		this.Exit();
	}
}
