import { ConditionsLimit, MiscCheat } from "../constants";
import { cheatIsEnabled, cheatSetEnabled } from "../modules/miscPatches";
import { registerRule, RuleType } from "../modules/rules";

export function initRules_bc_settings() {

	function preferenceSync() {
		ServerAccountUpdate.QueueData({
			ArousalSettings: Player.ArousalSettings,
			GameplaySettings: Player.GameplaySettings,
			ImmersionSettings: Player.ImmersionSettings,
			OnlineSettings: Player.OnlineSettings,
			OnlineSharedSettings: Player.OnlineSharedSettings,
			GraphicsSettings: Player.GraphicsSettings,
			ItemPermission: Player.ItemPermission,
		});
	}

	function settingHelper(setting: string, defaultLimit: ConditionsLimit, shortDescription: string = "настройка BC"): RuleDisplayDefinition {
		return {
			name: `Принудительно '${setting}'`,
			type: RuleType.Setting,
			loggable: false,
			shortDescription,
			keywords: ["control", "settings", "configure", "change"],
			defaultLimit,
			longDescription: `Это правило заставляет PLAYER_NAME's базовая настройка игры '${setting}' на настраиваемое значение и не позволяет ей изменить его.`,
			triggerTexts: {
				infoBeep: `Правило изменило ваш параметр: '${setting}'`,
			},
		};
	}

	type BooleanRule =
		| "setting_forbid_lockpicking"
		| "setting_forbid_SP_rooms"
		| "setting_forbid_safeword"
		| "setting_block_vibe_modes"
		| "setting_show_afk"
		| "setting_allow_body_mod"
		| "setting_forbid_cosplay_change"
		| "setting_hide_non_adjecent"
		| "setting_blind_room_garbling"
		| "setting_relog_keeps_restraints"
		| "setting_leashed_roomchange"
		| "setting_plug_vibe_events"
		| "setting_allow_tint_effects"
		| "setting_allow_blur_effects"
		| "setting_upsidedown_view"
		| "setting_random_npc_events";
	function toggleSettingHelper({
		id,
		setting,
		shortDescription,
		defaultValue,
		defaultLimit,
		get,
		set,
	}: {
		id: BooleanRule;
		setting: string;
		shortDescription?: string;
		defaultValue: boolean;
		defaultLimit: ConditionsLimit;
		get: () => boolean | undefined;
		set: (value: boolean) => void;
	}) {
		return registerRule<BooleanRule>(id, {
			...settingHelper(setting, defaultLimit, shortDescription),
			longDescription: `Это правило заставляет PLAYER_NAME's базовая игра или настройка BCX '${setting}' настроенному значению и не позволяет ей его изменить. ` +
				`Существует также возможность восстановить настройку до того состояния, в котором она была до того, как правило изменило ее. Восстановление происходит либо тогда, когда правило становится ` +
				`неактивен (например, из-за переключения или невыполненных условий триггера) или когда он удален.`,
			dataDefinition: {
				value: {
					type: "toggle",
					description: setting,
					default: defaultValue,
				},
				restore: {
					type: "toggle",
					description: "Восстановить предыдущее значение после завершения правила",
					default: true,
					Y: 420,
				},
			},
			internalDataValidate: (data) => typeof data === "boolean",
			internalDataDefault: () => get() ?? false,
			stateChange(state, newState) {
				if (newState) {
					const current = get();
					if (current !== undefined) {
						state.internalData = current;
					}
				} else if (state.customData?.restore) {
					const old = state.internalData;
					if (old !== undefined) {
						set(old);
						preferenceSync();
					}
				}
			},
			tick(state) {
				if (state.isEnforced && state.customData) {
					const current = get();
					if (current == null) {
						console.error(`BCX: Undfined value while forcing setting ${setting}`);
						return false;
					}
					if (current !== state.customData.value) {
						set(state.customData.value);
						state.trigger();
						preferenceSync();
						return true;
					}
				}
				return false;
			},
		});
	}

	// "General" settings

	registerRule("setting_item_permission", {
		...settingHelper("Разрешение на предмет", ConditionsLimit.limited),
		dataDefinition: {
			value: {
				type: "listSelect",
				options: [
					["everyone", "Everyone, no exceptions"],
					["everyoneBlacklist", "Everyone, except blacklist"],
					["dominants", "Owner, Lovers, whitelist & Dominants"],
					["whitelist", "Owner, Lovers and whitelist only"],
				],
				default: "everyone",
				description: "Разрешение на предмет",
			},
		},
		tick(state) {
			if (state.isEnforced && state.customData) {
				const VALUE_CONVERSIONS: Record<string, typeof Player.ItemPermission> = {
					everyone: 0,
					everyoneBlacklist: 1,
					dominants: 2,
					whitelist: 3,
				};
				const wanted = VALUE_CONVERSIONS[state.customData.value] ?? 0;
				if (Player.ItemPermission !== wanted) {
					Player.ItemPermission = wanted;
					state.trigger();
					preferenceSync();
					return true;
				}
			}
			return false;
		},
	});

	toggleSettingHelper({
		id: "setting_forbid_lockpicking",
		setting: "Замки на вас не могут быть взломаны",
		defaultValue: true,
		defaultLimit: ConditionsLimit.limited,
		get: () => Player.OnlineSharedSettings?.DisablePickingLocksOnSelf,
		set: value => Player.OnlineSharedSettings!.DisablePickingLocksOnSelf = value,
	});

	toggleSettingHelper({
		id: "setting_forbid_SP_rooms",
		setting: "Невозможно войти в однопользовательскую комнату, если связан",
		defaultValue: true,
		defaultLimit: ConditionsLimit.limited,
		get: () => Player.GameplaySettings?.OfflineLockedRestrained,
		set: value => Player.GameplaySettings!.OfflineLockedRestrained = value,
	});

	toggleSettingHelper({
		id: "setting_forbid_safeword",
		setting: "Разрешить использование безопасного слова",
		defaultValue: false,
		defaultLimit: ConditionsLimit.limited,
		get: () => Player.GameplaySettings?.EnableSafeword,
		set: value => Player.GameplaySettings!.EnableSafeword = value,
	});

	// "Arousal" settings

	registerRule("setting_arousal_meter", {
		...settingHelper("Измеритель возбуждения", ConditionsLimit.limited),
		dataDefinition: {
			active: {
				type: "listSelect",
				options: [
					["Inactive", "Disable sexual activities"],
					["NoMeter", "Allow without a meter"],
					["Manual", "Allow with a manual meter"],
					["Hybrid", "Allow with a hybrid meter"],
					["Automatic", "Allow with a locked meter"],
				],
				default: "Hybrid",
				description: "Сексуальная активность - Активация",
			},
			visible: {
				type: "listSelect",
				options: [
					["All", "Show arousal to everyone"],
					["Access", "Show if they have access"],
					["Self", "Show to yourself only"],
				],
				default: "All",
				description: "Meter видимость",
				Y: 480,
			},
		},
		tick(state) {
			let change = false;
			if (state.isEnforced && state.customData && Player.ArousalSettings) {
				if (Player.ArousalSettings.Active !== state.customData.active) {
					Player.ArousalSettings.Active = state.customData.active;
					change = true;
				}
				if (Player.ArousalSettings.Visible !== state.customData.visible) {
					Player.ArousalSettings.Visible = state.customData.visible;
					change = true;
				}
				if (change) {
					state.trigger();
					preferenceSync();
				}
			}
			return change;
		},
	});

	toggleSettingHelper({
		id: "setting_block_vibe_modes",
		setting: "Блокировать расширенные режимы вибратора",
		defaultValue: false,
		defaultLimit: ConditionsLimit.limited,
		get: () => Player.ArousalSettings?.DisableAdvancedVibes,
		set: value => Player.ArousalSettings!.DisableAdvancedVibes = value,
	});

	registerRule("setting_arousal_stutter", {
		...settingHelper("Речевое заикание при возбуждении", ConditionsLimit.limited),
		dataDefinition: {
			value: {
				type: "listSelect",
				options: [
					["None", "Never stutter"],
					["Arousal", "When you're aroused"],
					["Vibration", "When you're vibrated"],
					["All", "Aroused & vibrated"],
				],
				default: "All",
				description: "Речевое заикание",
			},
		},
		tick(state) {
			if (state.isEnforced && state.customData && Player.ArousalSettings) {
				if (Player.ArousalSettings.AffectStutter !== state.customData.value) {
					Player.ArousalSettings.AffectStutter = state.customData.value;
					state.trigger();
					preferenceSync();
					return true;
				}
			}
			return false;
		},
	});

	// "Online" settings

	toggleSettingHelper({
		id: "setting_show_afk",
		setting: "Показать пузырь AFK",
		defaultValue: true,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.OnlineSettings?.EnableAfkTimer,
		set: value => Player.OnlineSettings!.EnableAfkTimer = value,
	});

	toggleSettingHelper({
		id: "setting_allow_body_mod",
		setting: "Позвольте другим полностью изменить вашу внешность",
		defaultValue: true,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.OnlineSharedSettings?.AllowFullWardrobeAccess,
		set: value => Player.OnlineSharedSettings!.AllowFullWardrobeAccess = value,
	});

	toggleSettingHelper({
		id: "setting_forbid_cosplay_change",
		setting: "Не позволяйте другим менять предметы косплея",
		defaultValue: false,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.OnlineSharedSettings?.BlockBodyCosplay,
		set: value => Player.OnlineSharedSettings!.BlockBodyCosplay = value,
	});

	// "Immersion" settings

	registerRule("setting_sensdep", {
		...settingHelper("Настройка сенсорной депривации", ConditionsLimit.blocked),
		dataDefinition: {
			value: {
				type: "listSelect",
				options: [
					["SensDepLight", "Light"],
					["Normal", "Normal"],
					["SensDepNames", "Hide names"],
					["SensDepTotal", "Heavy"],
					["SensDepExtreme", "Total"],
				],
				default: "Normal",
				description: "Настройка сенсорной депривации",
			},
			disableExamine: {
				type: "toggle",
				default: false,
				description: "Отключить исследование вслепую",
				Y: 480,
			},
			hideMessages: {
				type: "toggle",
				default: false,
				description: "Скрыть сообщения других",
				Y: 580,
			},
		},
		tick(state) {
			let changed = false;
			if (state.isEnforced && state.customData && Player.GameplaySettings && Player.ImmersionSettings) {
				if (Player.GameplaySettings.SensDepChatLog !== state.customData.value) {
					Player.GameplaySettings.SensDepChatLog = state.customData.value;
					changed = true;
				}
				const bdeForceOff = state.customData.value === "SensDepLight";
				const bdeForceOn = state.customData.value === "SensDepExtreme";
				const bdeTarget = (state.customData.disableExamine && !bdeForceOff) || bdeForceOn;
				if (Player.GameplaySettings.BlindDisableExamine !== bdeTarget) {
					Player.GameplaySettings.BlindDisableExamine = bdeTarget;
					changed = true;
				}
				const canHideMessages = state.customData.value !== "SensDepLight";
				const hideMessagesTarget = canHideMessages && state.customData.hideMessages;
				if (Player.ImmersionSettings.SenseDepMessages !== hideMessagesTarget) {
					Player.ImmersionSettings.SenseDepMessages = hideMessagesTarget;
					changed = true;
				}
				if (changed) {
					state.trigger();
					preferenceSync();
				}
			}
			return changed;
		},
	});

	toggleSettingHelper({
		id: "setting_hide_non_adjecent",
		setting: "Скрыть несмежных игроков, пока они частично слепы",
		defaultValue: true,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.ImmersionSettings?.BlindAdjacent,
		set: value => Player.ImmersionSettings!.BlindAdjacent = value,
	});

	toggleSettingHelper({
		id: "setting_blind_room_garbling",
		setting: "Искажать названия и описания чатов вслепую",
		defaultValue: true,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.ImmersionSettings?.ChatRoomMuffle,
		set: value => Player.ImmersionSettings!.ChatRoomMuffle = value,
	});

	toggleSettingHelper({
		id: "setting_relog_keeps_restraints",
		setting: "Соблюдайте все ограничения при повторном входе",
		defaultValue: true,
		defaultLimit: ConditionsLimit.limited,
		get: () => Player.GameplaySettings?.DisableAutoRemoveLogin,
		set: value => Player.GameplaySettings!.DisableAutoRemoveLogin = value,
	});

	toggleSettingHelper({
		id: "setting_leashed_roomchange",
		setting: "Игроки могут перетаскивать вас в комнаты на поводке.",
		defaultValue: true,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.OnlineSharedSettings?.AllowPlayerLeashing,
		set: value => Player.OnlineSharedSettings!.AllowPlayerLeashing = value,
	});

	registerRule("setting_room_rejoin", {
		...settingHelper("Вернуться в чаты при релоге", ConditionsLimit.limited),
		dataDefinition: {
			value: {
				type: "toggle",
				default: true,
				description: "Вернуться в чаты при релоге",
			},
			remakeRooms: {
				type: "toggle",
				default: false,
				description: "Автопеределка комнат",
				Y: 425,
			},
		},
		tick(state) {
			let changed = false;
			if (state.isEnforced && state.customData && Player.ImmersionSettings) {
				if (Player.ImmersionSettings.ReturnToChatRoom !== state.customData.value) {
					Player.ImmersionSettings.ReturnToChatRoom = state.customData.value;
					changed = true;
				}
				const returnToRoomEnabled = state.customData.value;
				const remakeRoomTarget = returnToRoomEnabled && state.customData.remakeRooms;
				if (Player.ImmersionSettings.ReturnToChatRoomAdmin !== remakeRoomTarget) {
					Player.ImmersionSettings.ReturnToChatRoomAdmin = remakeRoomTarget;
					changed = true;
				}
				if (changed) {
					state.trigger();
					preferenceSync();
				}
			}
			return changed;
		},
	});

	toggleSettingHelper({
		id: "setting_plug_vibe_events",
		setting: "События во время подключения или вибрации",
		defaultValue: true,
		defaultLimit: ConditionsLimit.normal,
		get: () => Player.ImmersionSettings?.StimulationEvents,
		set: value => Player.ImmersionSettings!.StimulationEvents = value,
	});

	toggleSettingHelper({
		id: "setting_allow_tint_effects",
		setting: "Разрешить эффекты оттенка предметов",
		defaultValue: true,
		defaultLimit: ConditionsLimit.limited,
		get: () => Player.ImmersionSettings?.AllowTints,
		set: value => Player.ImmersionSettings!.AllowTints = value,
	});

	// "Graphics" settings

	toggleSettingHelper({
		id: "setting_allow_blur_effects",
		setting: "Разрешить эффекты размытия предметов",
		defaultValue: true,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.GraphicsSettings?.AllowBlur,
		set: value => Player.GraphicsSettings!.AllowBlur = value,
	});

	toggleSettingHelper({
		id: "setting_upsidedown_view",
		setting: "Перевернуть комнату вертикально, когда она перевернута",
		defaultValue: true,
		defaultLimit: ConditionsLimit.blocked,
		get: () => Player.GraphicsSettings?.InvertRoom,
		set: value => Player.GraphicsSettings!.InvertRoom = value,
	});

	// "Misc" module settings

	toggleSettingHelper({
		id: "setting_random_npc_events",
		setting: "Предотвратите случайные события NPC",
		shortDescription: "из модуля 'Разное' BCX",
		defaultValue: true,
		defaultLimit: ConditionsLimit.normal,
		get: () => cheatIsEnabled(MiscCheat.BlockRandomEvents),
		set: value => cheatSetEnabled(MiscCheat.BlockRandomEvents, value),
	});

}
