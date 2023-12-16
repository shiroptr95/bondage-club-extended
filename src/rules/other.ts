import { BCXLoadedBeforeLogin, BCXLoginTimedata, BCX_setTimeout } from "../BCXContext";
import { ConditionsLimit } from "../constants";
import { AccessLevel, getCharacterAccessLevel } from "../modules/authority";
import { registerWhisperCommand } from "../modules/commands";
import { registerRule, RuleType } from "../modules/rules";
import { formatTimeInterval, isObject } from "../utils";
import { ChatRoomSendLocal } from "../utilsClub";

export function initRules_other() {
	let lastAction = Date.now();
	let afkDidTrigger = false;
	function afk_reset() {
		lastAction = Date.now();
		afkDidTrigger = false;
	}

	registerRule("other_forbid_afk", {
		name: "Запретить идти в afk",
		type: RuleType.Other,
		enforceable: false,
		shortDescription: "журналы всякий раз, когда PLAYER_NAME неактивен",
		longDescription: "Это правило запрещает PLAYER_NAME отключаться и регистрироваться при превышении разрешенного порога бездействия.",
		keywords: ["inactivity", "detect", "record"],
		triggerTexts: {
			log: "PLAYER_NAME стал неактивным, что было запрещено",
			announce: "",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minutesBeforeAfk: {
				type: "number",
				default: 10,
				description: "Количество минут, прежде чем считаться неактивным:",
			},
		},
		load() {
			AfkTimerEventsList.forEach(e => document.addEventListener(e, afk_reset, true));
		},
		tick(state) {
			if (!afkDidTrigger && state.inEffect && state.customData &&
				Date.now() > lastAction + state.customData.minutesBeforeAfk * 60 * 1000
			) {
				afkDidTrigger = true;
				state.trigger();
				ChatRoomSendLocal("Вы нарушили правило BCX, будучи неактивным слишком долго. Преступление было зарегистрировано.");
				return true;
			}
			return false;
		},
		unload() {
			AfkTimerEventsList.forEach(e => document.removeEventListener(e, afk_reset, true));
		},
	});

	let lastUpdate: number = 0;
	registerRule("other_track_time", {
		name: "Отслеживать время действия правила",
		type: RuleType.Other,
		enforceable: false,
		loggable: false,
		shortDescription: "подсчитывает время выполнения условий срабатывания этого правила",
		longDescription: "Это правило показывает, сколько времени PLAYER_NAME потрачено (онлайн) в клубе с момента добавления правила и при выполнении всех условий срабатывания правила. Таким образом, он может, например, регистрировать время, проведенное в общественных помещениях/в клубе в целом, или в конкретной комнате, или с каким-либо человеком в рамках ролевого задания или приказа. Текущее отслеживаемое время можно узнать, прошептав '!ruletime' PLAYER_NAME. Чтобы сбросить счетчик, удалите и добавьте правило снова.",
		keywords: ["record", "stopwatch", "timer", "online"],
		internalDataValidate: (v) => typeof v === "number",
		internalDataDefault: () => 0,
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumPermittedRole: {
				type: "roleSelector",
				default: AccessLevel.lover,
				description: "Минимальная роль, способная запросить отсчёт времени:",
			},
		},
		init(state) {
			registerWhisperCommand("hidden", "ruletime", null, (argv, sender, respond) => {
				if (state.condition && state.customData && state.internalData !== undefined && getCharacterAccessLevel(sender) <= state.customData.minimumPermittedRole) {
					const fixup = state.inEffect ? (Date.now() - lastUpdate) : 0;
					const msg = `Since the time tracking rule was added, ${formatTimeInterval(state.internalData + fixup)} were counted, where all trigger conditions were true.`;
					respond(msg);
					return true;
				}
				return false;
			}, null, false);
		},
		load() {
			lastUpdate = Date.now();
		},
		tick(state) {
			if (state.inEffect && state.internalData !== undefined) {
				const change = Math.floor(Date.now() - lastUpdate);
				if (change >= 60_000) {
					state.internalData += change;
					lastUpdate = Date.now();
				}
			}
			return false;
		},
		stateChange(state, newState) {
			if (newState) {
				lastUpdate = Date.now();
			} else if (state.internalData !== undefined) {
				const change = Math.floor(Date.now() - lastUpdate);
				state.internalData += change;
				lastUpdate = Date.now();
			}
		},
	});

	let lastReminder = 0;
	registerRule("other_constant_reminder", {
		name: "Послушай мой голос",
		type: RuleType.Other,
		loggable: false,
		enforceable: false,
		shortDescription: "регулярно показывать настраиваемые предложения PLAYER_NAME",
		longDescription: "Это правило напоминает или рассказывает PLAYER_NAME одно из записанных предложений случайным образом в заданном интервале. Только PLAYER_NAME может видеть установленное сообщение, и оно отображается только в чате.",
		keywords: ["hear", "voices", "in", "head", "messages", "periodic"],
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			reminderText: {
				type: "stringList",
				default: [],
				description: "Предложения, которые будут показаны случайным образом:",
				Y: 296,
			},
			reminderFrequency: {
				type: "number",
				default: 15,
				description: "Частота показа предложения (в минутах):",
				Y: 715,
			},
		},
		tick(state) {
			if (state.inEffect && state.customData && state.customData.reminderText.length > 0 &&
				ServerPlayerIsInChatRoom() &&
				Date.now() > lastReminder + state.customData.reminderFrequency * 60 * 1000
			) {
				lastReminder = Date.now();
				ChatRoomSendLocal("[Voice] " + state.customData.reminderText[Math.floor(Math.random() * state.customData.reminderText.length)]);
				return true;
			}
			return false;
		},
	});

	registerRule("other_log_money", {
		name: "Записывать изменения денег",
		type: RuleType.Other,
		enforceable: false,
		shortDescription: "тратить и/или получать деньги",
		longDescription: "Это правило регистрируется всякий раз, когда деньги используются для покупки чего-либо. Также показано, сколько денег PLAYER_NAME на данный момент есть запись в журнале. При желании можно также зарегистрировать заработок. Примечание. Имейте в виду, что этот последний вариант потенциально может быстро заполнить весь журнал поведения.",
		keywords: ["record", "balance", "earnings", "using", "tracking", "logging", "entry", "financial", "findom"],
		triggerTexts: {
			infoBeep: "Правило BCX зарегистрировало эту финансовую транзакцию!",
			log: "PLAYER_NAME TYPE деньги: AMOUNT $ | новый баланс: BALANCE $",
			announce: "",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			logEarnings: {
				type: "toggle",
				default: false,
				description: "Записать в журнал изменение денег",
			},
		},
		internalDataValidate: (data) => typeof data === "number",
		internalDataDefault: () => -1,
		stateChange(state, newState) {
			if (!newState) {
				state.internalData = -1;
			}
		},
		tick(state) {
			if (!state.internalData || !Number.isFinite(Player.Money))
				return false;
			let returnValue = false;
			if (state.inEffect) {
				if (state.internalData < 0) {
					state.internalData = Player.Money;
				}
				if (state.internalData > Player.Money) {
					state.trigger(null, { TYPE: "spent", AMOUNT: `${state.internalData - Player.Money}`, BALANCE: `${Player.Money}` });
					returnValue = true;
				} else if (state.internalData < Player.Money && state.customData && state.customData.logEarnings) {
					state.trigger(null, { TYPE: "earned", AMOUNT: `${Player.Money - state.internalData}`, BALANCE: `${Player.Money}` });
					returnValue = true;
				}
				if (state.internalData !== Player.Money) {
					state.internalData = Player.Money;
				}
			}
			return returnValue;
		},
	});

	/* TODO: Idea stage
	registerRule("other_restrict_console_usage", {
		name: "Restrict console usage",
		type: RuleType.Other,
		loggable: false,
		shortDescription: "to not allow freeing oneself",
		longDescription: "Makes the player unable to use the browser console to change their own appearance in the club, such as removing restraints.",
		defaultLimit: ConditionsLimit.blocked
	});
	*/

	const removeTrackingEntry = (hiddenItems: any[]) => {
		for (; ;) {
			const index = hiddenItems.findIndex(a => isObject(a) && typeof a.Name === "string" && a.Name.startsWith("GoodGirl") && a.Group === "BCX");
			if (index < 0)
				break;
			hiddenItems.splice(index, 1);
		}
	};

	const hasTrackingEntry = (hiddenItems: any[], token: number) => {
		return hiddenItems.some(a => isObject(a) && a.Name === `GoodGirl${token}` && a.Group === "BCX");
	};

	const addTrackingEntry = (hiddenItems: any[], token: number) => {
		removeTrackingEntry(hiddenItems);
		hiddenItems.push({ Name: `GoodGirl${token}`, Group: "BCX" });
	};

	registerRule("other_track_BCX_activation", {
		name: "Отслеживать активацию BCX",
		type: RuleType.Other,
		enforceable: false,
		shortDescription: "журналы, если PLAYER_NAME входит в клуб без BCX",
		longDescription: "Это правило соблюдает PLAYER_NAME,регистрация этого как нарушение правил, если ранее хотя бы один раз в клуб входили без активного BCX.",
		keywords: ["record", "online", "force", "useage", "using", "login"],
		triggerTexts: {
			infoBeep: "Вы вошли в систему, не запустив BCX заранее!",
			log: "PLAYER_NAME вошел в систему без предварительного запуска BCX хотя бы один раз",
			announce: "",
		},
		internalDataValidate: (v) => typeof v === "number",
		internalDataDefault: () => Math.floor(Math.random() * 1_000_000),
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			if (state.inEffect && state.internalData !== undefined) {
				if (
					!BCXLoadedBeforeLogin ||
					!Array.isArray(BCXLoginTimedata.HiddenItems) ||
					!hasTrackingEntry(BCXLoginTimedata.HiddenItems, state.internalData)
				) {
					BCX_setTimeout(() => {
						state.trigger();
						state.internalData = Math.floor(Math.random() * 1_000_000);
						addTrackingEntry(Player.HiddenItems, state.internalData);
						ServerPlayerBlockItemsSync();
					}, 3_500);
				} else {
					state.internalData = Math.floor(Math.random() * 1_000_000);
					addTrackingEntry(Player.HiddenItems, state.internalData);
					ServerPlayerBlockItemsSync();
				}
			}
		},
		stateChange(state, newState) {
			if (newState) {
				state.internalData = Math.floor(Math.random() * 1_000_000);
				addTrackingEntry(Player.HiddenItems, state.internalData);
				ServerPlayerBlockItemsSync();
			} else {
				removeTrackingEntry(Player.HiddenItems);
				ServerPlayerBlockItemsSync();
			}
		},
		tick(state) {
			if (state.inEffect && state.internalData !== undefined) {
				if (!hasTrackingEntry(Player.HiddenItems, state.internalData) || Math.random() < 0.01) {
					state.internalData = Math.floor(Math.random() * 1_000_000);
					addTrackingEntry(Player.HiddenItems, state.internalData);
					ServerPlayerBlockItemsSync();
				}
			}
			return false;
		},
	});
}
