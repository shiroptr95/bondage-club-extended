import { ModuleCategory, ConditionsLimit } from "../constants";
import { HookDialogMenuButtonClick as hookDialogMenuButtonClick, OverridePlayerDialog, RedirectGetImage } from "../modules/miscPatches";
import { registerRule, RuleType } from "../modules/rules";
import { hookFunction } from "../patching";
import { isNModClient } from "../utilsClub";
import { AccessLevel, getCharacterAccessLevel } from "../modules/authority";
import { getAllCharactersInRoom } from "../characters";
import { GetDialogMenuButtonArray } from "../modules/dialog";

export function initRules_bc_blocks() {
	const NMod = isNModClient();

	registerRule("block_remoteuse_self", {
		name: "Запретить использование пультов на себе",
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME используя один на PLAYER_NAME",
		longDescription: "Это правило запрещает PLAYER_NAME использовать или активировать вибратор или аналогичный предмет с дистанционным управлением на своем теле. (Другие все еще могут использовать для нее пульты)",
		keywords: ["controling", "preventing", "limiting", "vibrating", "vibrations"],
		triggerTexts: {
			infoBeep: "Запрещается использовать пульт дистанционного управления для предметов, находящихся на вашем теле!",
			attempt_log: "PLAYER_NAME пыталась использовать пульт дистанционного управления на своем теле, что было запрещено",
			log: "PLAYER_NAME использовала пульт дистанционного управления на своем теле, что было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			OverridePlayerDialog("BCX_RemoteDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Remote.png", "Icons/Remote.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID === 0 && state.isEnforced) {
					const index = GetDialogMenuButtonArray().indexOf("Remote");
					if (index >= 0) {
						GetDialogMenuButtonArray()[index] = "BCX_RemoteDisabled";
					}
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("Remote", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.trigger();
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_RemoteDisabled", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.triggerAttempt();
				}
				return false;
			});
			hookFunction("DialogItemClick", 3, (args, next) => {
				const C = (Player.FocusGroup != null) ? Player : CurrentCharacter;
				if (C && C.ID === 0 && state.isEnforced && args[0].Asset.Name === "VibratorRemote") {
					state.triggerAttempt();
					return;
				}
				if (C && C.ID === 0 && state.isLogged && args[0].Asset.Name === "VibratorRemote") {
					state.trigger();
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_remoteuse_others", {
		name: "Запретить использование пультов на других",
		type: RuleType.Block,
		longDescription: "Это правило запрещает PLAYER_NAME использовать или активировать вибратор или аналогичный предмет с дистанционным управлением на других членах клуба.",
		keywords: ["controling", "preventing", "limiting", "vibrating", "vibrations"],
		triggerTexts: {
			infoBeep: "Запрещается использовать пульт дистанционного управления на чужих предметах!",
			attempt_log: "PLAYER_NAME пытался использовать пульт дистанционного управления на TARGET_PLAYER's тело, которое было запрещено",
			log: "PLAYER_NAME использовал пульт дистанционного управления на TARGET_PLAYER's тело, которое было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			OverridePlayerDialog("BCX_RemoteDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Remote.png", "Icons/Remote.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID !== 0 && state.isEnforced) {
					const index = GetDialogMenuButtonArray().indexOf("Remote");
					if (index >= 0) {
						GetDialogMenuButtonArray()[index] = "BCX_RemoteDisabled";
					}
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("Remote", (C) => {
				if (C.ID !== 0 && state.inEffect) {
					state.trigger(C.MemberNumber);
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_RemoteDisabled", (C) => {
				if (C.ID !== 0 && state.inEffect) {
					state.triggerAttempt(C.MemberNumber);
				}
				return false;
			});
			hookFunction("DialogItemClick", 3, (args, next) => {
				const C = (Player.FocusGroup != null) ? Player : CurrentCharacter;
				if (C && C.ID !== 0 && state.isEnforced && args[0].Asset.Name === "VibratorRemote") {
					state.triggerAttempt(C.MemberNumber);
					return;
				}
				if (C && C.ID !== 0 && state.isLogged && args[0].Asset.Name === "VibratorRemote") {
					state.trigger(C.MemberNumber);
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_keyuse_self", {
		name: "Запретить использование ключей на себя",
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME используя один на PLAYER_NAME",
		longDescription: "Это правило запрещает PLAYER_NAME чтобы разблокировать любой запертый предмет на своем теле. Примечание. Несмотря на название, это правило также блокирует разблокировку замков, для которых не требуется ключ (например, эксклюзивная блокировка). Однако замки, которые можно разблокировать другими способами (блокировка таймером путем удаления времени, блокировка кодом/паролем путем ввода правильного кода), все равно можно разблокировать с помощью PLAYER_NAME. Другие по-прежнему могут разблокировать ее предметы в обычном режиме.",
		keywords: ["controling", "taking", "away", "limiting", "confiscate", "locks"],
		triggerTexts: {
			infoBeep: "Вам не разрешается использовать ключ на предметах на вашем теле!",
			attempt_log: "PLAYER_NAME пытался использовать ключ на изношенной вещи, что было запрещено",
			log: "PLAYER_NAME использовал ключ на изношенной вещи, что было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			OverridePlayerDialog("BCX_UnlockDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Unlock.png", "Icons/Unlock.png");
			hookFunction("DialogCanUnlock", 0, (args, next) => {
				const C = args[0];
				if (C.ID === 0 && state.isEnforced)
					return false;
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID === 0 && state.isEnforced && GetDialogMenuButtonArray().includes("InspectLock")) {
					GetDialogMenuButtonArray().splice(-1, 0, "BCX_UnlockDisabled");
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("Unlock", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.trigger();
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_UnlockDisabled", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.triggerAttempt();
				}
				return false;
			});
		},
	});

	registerRule("block_keyuse_others", {
		name: "Запретить использование ключей на других",
		type: RuleType.Block,
		longDescription: "Это правило запрещает PLAYER_NAME чтобы разблокировать любой заблокированный предмет у других членов клуба, с возможностью по-прежнему разрешить разблокировку замков и предметов владельца и / или любовника. Примечание. Несмотря на название, это правило также блокирует разблокировку замков, для которых не требуется ключ (например, эксклюзивная блокировка). Однако замки, которые можно разблокировать другими способами (блокировка таймером путем удаления времени, блокировка кодом/паролем путем ввода правильного кода), все равно можно разблокировать с помощью PLAYER_NAME.",
		keywords: ["controling", "taking", "away", "limiting", "confiscate", "locks"],
		triggerTexts: {
			infoBeep: "Вам не разрешено использовать ключ на чужих предметах!",
			attempt_log: "PLAYER_NAME пытался использовать ключ для разблокировки TARGET_PLAYER's предмет, который был запрещен",
			log: "PLAYER_NAME использовал ключ, чтобы разблокировать TARGET_PLAYER's предмет, который был запрещен",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			allowOwnerLocks: {
				type: "toggle",
				default: false,
				description: "Still allow unlocking owner locks or items",
			},
			allowLoverLocks: {
				type: "toggle",
				default: false,
				description: "Still allow unlocking lover locks or items",
				Y: 530,
			},
		},
		load(state) {
			let ignore = false;
			OverridePlayerDialog("BCX_UnlockDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Unlock.png", "Icons/Unlock.png");
			hookFunction("DialogCanUnlock", 0, (args, next) => {
				const C = args[0];
				const Item = args[1];
				const lock = InventoryGetLock(Item);
				if (state.customData &&
					C.ID !== 0 &&
					Item != null &&
					Item.Asset != null &&
					(
						(state.customData.allowOwnerLocks && (Item.Asset.OwnerOnly || lock?.Asset.OwnerOnly) && C.IsOwnedByPlayer()) ||
						(state.customData.allowLoverLocks && (Item.Asset.LoverOnly || lock?.Asset.LoverOnly) && C.IsLoverOfPlayer())
					)
				) {
					ignore = true;
					return next(args);
				}
				ignore = false;
				if (C.ID !== 0 && state.isEnforced)
					return false;
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				if (!ignore) {
					const C = args[0];
					if (C.ID !== 0 && state.isEnforced && GetDialogMenuButtonArray().includes("InspectLock")) {
						GetDialogMenuButtonArray().splice(-1, 0, "BCX_UnlockDisabled");
					}
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("Unlock", (C) => {
				if (!ignore && C.ID !== 0 && state.inEffect) {
					state.trigger(C.MemberNumber);
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_UnlockDisabled", (C) => {
				if (!ignore && C.ID !== 0 && state.inEffect) {
					state.triggerAttempt(C.MemberNumber);
				}
				return false;
			});
		},
	});

	registerRule("block_lockpicking_self", {
		name: "Forbid picking locks on self",
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME выбирая один на PLAYER_NAME",
		longDescription: "Это правило запрещает PLAYER_NAME взламывать любые запертые предметы на своем теле. (Другие все еще могут нормально взламывать ее замки)",
		keywords: ["controling", "limiting", "secure", "security"],
		triggerTexts: {
			infoBeep: "Вам не разрешается взламывать изношенные предметы на вашем теле.!",
			attempt_log: "PLAYER_NAME пытался взломать изношенную вещь, что было запрещено",
			log: "PLAYER_NAME взломал замок изношенной вещи, что было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			OverridePlayerDialog("BCX_PickLockDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_PickLock.png", "Icons/PickLock.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID === 0 && state.isEnforced) {
					const index = GetDialogMenuButtonArray().indexOf("PickLock");
					if (index >= 0) {
						GetDialogMenuButtonArray()[index] = "BCX_PickLockDisabled";
					}
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("PickLock", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.trigger();
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_PickLockDisabled", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.triggerAttempt();
				}
				return false;
			});
		},
	});

	registerRule("block_lockpicking_others", {
		name: "Запретить взламывать чужие замки",
		type: RuleType.Block,
		longDescription: "Это правило запрещает PLAYER_NAME взламывать любые запертые предметы у других членов клуба.",
		keywords: ["controling", "limiting", "secure", "security"],
		triggerTexts: {
			infoBeep: "Вам не разрешено взламывать предметы у других!",
			attempt_log: "PLAYER_NAME пытался взломать предмет на TARGET_PLAYER, что было запрещено",
			log: "PLAYER_NAME взломал предмет на TARGET_PLAYER, что было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			OverridePlayerDialog("BCX_PickLockDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_PickLock.png", "Icons/PickLock.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID !== 0 && state.isEnforced) {
					const index = GetDialogMenuButtonArray().indexOf("PickLock");
					if (index >= 0) {
						GetDialogMenuButtonArray()[index] = "BCX_PickLockDisabled";
					}
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("PickLock", (C) => {
				if (C.ID !== 0 && state.inEffect) {
					state.trigger(C.MemberNumber);
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_PickLockDisabled", (C) => {
				if (C.ID !== 0 && state.inEffect) {
					state.triggerAttempt(C.MemberNumber);
				}
				return false;
			});
		},
	});

	registerRule("block_lockuse_self", {
		name: "Запретить использование блокировок на себя",
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME используя один на PLAYER_NAME",
		longDescription: "Это правило запрещает PLAYER_NAME использовать любой вид замка на своем теле. (Другие по-прежнему могут добавлять блокировки к ее предметам в обычном режиме.)",
		keywords: ["controling", "limiting", "locking", "preventing"],
		triggerTexts: {
			infoBeep: "Вам не разрешено запирать предметы на своем теле.!",
			attempt_log: "PLAYER_NAME пытался запереть надетую вещь, что было запрещено",
			log: "PLAYER_NAME запер надетую вещь, которая была запрещена",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			OverridePlayerDialog("BCX_LockDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Lock.png", "Icons/Lock.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID === 0 && state.isEnforced) {
					const index = GetDialogMenuButtonArray().indexOf("Lock");
					if (index >= 0) {
						GetDialogMenuButtonArray()[index] = "BCX_LockDisabled";
					}
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("Lock", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.trigger();
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_LockDisabled", (C) => {
				if (C.ID === 0 && state.inEffect) {
					state.triggerAttempt();
				}
				return false;
			});
		},
	});

	registerRule("block_lockuse_others", {
		name: "Запретить использовать блокировки на других",
		type: RuleType.Block,
		longDescription: "Это правило запрещает PLAYER_NAME использовать любые виды блокировки на других членах клуба.",
		keywords: ["controling", "limiting", "locking", "preventing"],
		triggerTexts: {
			infoBeep: "Вам не разрешено блокировать чужие предметы!",
			attempt_log: "PLAYER_NAME пытался заблокировать TARGET_PLAYER's предмет, который был запрещен",
			log: "PLAYER_NAME заперто TARGET_PLAYER's предмет, который был запрещен",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			OverridePlayerDialog("BCX_LockDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Lock.png", "Icons/Lock.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID !== 0 && state.isEnforced) {
					const index = GetDialogMenuButtonArray().indexOf("Lock");
					if (index >= 0) {
						GetDialogMenuButtonArray()[index] = "BCX_LockDisabled";
					}
				}
			}, ModuleCategory.Rules);
			hookDialogMenuButtonClick("Lock", (C) => {
				if (C.ID !== 0 && state.inEffect) {
					state.trigger(C.MemberNumber);
				}
				return false;
			});
			hookDialogMenuButtonClick("BCX_LockDisabled", (C) => {
				if (C.ID !== 0 && state.inEffect) {
					state.triggerAttempt(C.MemberNumber);
				}
				return false;
			});
		},
	});

	// TODO: Make it clearer it is blocked by BCX
	registerRule("block_wardrobe_access_self", {
		name: "Запретить использование гардероба на себе",
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME с использованием PLAYER_NAME's гардероб",
		longDescription: "Это правило запрещает PLAYER_NAME чтобы получить доступ к ее собственному гардеробу. (Другие все еще могут нормально переодеться.)",
		keywords: ["controling", "limiting", "clothings", "preventing", "changing"],
		triggerTexts: {
			infoBeep: "Вам не разрешено менять то, что вы носите!",
			attempt_log: "PLAYER_NAME пытались воспользоваться своим гардеробом, что было запрещено",
			log: "PLAYER_NAME пользовались своим гардеробом, что было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			hookFunction("Player.CanChangeClothesOn", 2, (args, next) => {
				const C = args[0];
				if (C.IsPlayer() && state.isEnforced) {
					return false;
				}
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("CharacterAppearanceLoadCharacter", 0, (args, next) => {
				const C = args[0];
				if (C.ID === 0 && state.inEffect) {
					state.trigger();
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	// TODO: Make it clearer it is blocked by BCX
	registerRule("block_wardrobe_access_others", {
		name: "Forbid wardrobe use on others",
		type: RuleType.Block,
		longDescription: "This rule forbids PLAYER_NAME to use the wardrobe of other club members.",
		keywords: ["controling", "limiting", "clothings", "preventing", "changing"],
		triggerTexts: {
			infoBeep: "You are not allowed to change what others wear!",
			attempt_log: "PLAYER_NAME tried to use TARGET_PLAYER's wardrobe, which was forbidden",
			log: "PLAYER_NAME used TARGET_PLAYER's wardrobe, which was forbidden",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			hookFunction("Player.CanChangeClothesOn", 2, (args, next) => {
				const C = args[0];
				if (!C.IsPlayer() && state.isEnforced) {
					return false;
				}
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("CharacterAppearanceLoadCharacter", 0, (args, next) => {
				const C = args[0];
				if (C.ID !== 0 && state.inEffect) {
					state.trigger();
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_restrict_allowed_poses", {
		name: "Ограничить разрешенные позы тела",
		type: RuleType.Block,
		loggable: false,
		longDescription: "Позволяет ограничить позы тела. PLAYER_NAME способна проникнуть сама.",
		keywords: ["controling", "limiting", "preventing", "changing"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			poseButtons: {
				type: "poseSelect",
				default: [],
				description: "Mark poses as being allowed or forbidden:",
			},
		},
		load(state) {
			let bypassPoseChange = false;
			hookFunction("CharacterCanChangeToPose", 3, (args, next) => {
				if (!bypassPoseChange && state.isEnforced && state.customData?.poseButtons.includes(args[1]))
					return false;
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomCanAttemptStand", 3, (args, next) => {
				if (state.isEnforced && state.customData?.poseButtons.includes("BaseLower"))
					return false;
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomCanAttemptKneel", 3, (args, next) => {
				if (state.isEnforced && state.customData?.poseButtons.includes("Kneel"))
					return false;
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("CharacterCanKneel", 3, (args, next) => {
				if (state.isEnforced && state.customData?.poseButtons.includes("Kneel") && !Player.IsKneeling())
					return false;
				if (state.isEnforced && state.customData?.poseButtons.includes("BaseLower") && Player.IsKneeling())
					return false;
				bypassPoseChange = true;
				const res = next(args);
				bypassPoseChange = false;
				return res;
			}, ModuleCategory.Rules);
		},
	});

	// TODO: Triggers on opening chat create *window*, improve to trigger on actual room creation
	registerRule("block_creating_rooms", {
		name: "Forbid creating new rooms",
		type: RuleType.Block,
		longDescription: "This rule forbids PLAYER_NAME to create new rooms.",
		keywords: ["controling", "limiting", "preventing"],
		triggerTexts: {
			infoBeep: "You are not allowed to create a new room!",
			attempt_log: "PLAYER_NAME tried to create a chatroom, which was forbidden",
			log: "PLAYER_NAME created a chatroom, which was forbidden",
			announce: "",
			attempt_announce: "",
		},
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			// TODO: Fix for NMod
			if (!NMod) {
				hookFunction("ChatSearchRun", 0, (args, next) => {
					next(args);
					if (state.isEnforced && ChatSearchMode === "") {
						DrawButton(1685, 885, 90, 90, "", "Gray", "Icons/Plus.png", TextGet("CreateRoom") + "(Blocked by BCX)", true);
					}
				}, ModuleCategory.Rules);
			}
			hookFunction("CommonSetScreen", 5, (args, next) => {
				if (args[0] === "Online" && args[1] === "ChatCreate") {
					if (state.isEnforced) {
						state.triggerAttempt();
						return;
					} else if (state.inEffect) {
						state.trigger();
					}
				}
				next(args);
			}, ModuleCategory.Rules);
		},
	});

	// TODO: Triggers on attempting to enter room, improve to trigger on actual room entry
	registerRule("block_entering_rooms", {
		name: "Restrict entering rooms",
		type: RuleType.Block,
		shortDescription: "only allow entering specific ones",
		longDescription: "This rule forbids PLAYER_NAME to enter all rooms, that are not on an editable whitelist of still allowed ones. NOTE: As safety measure this rule is not in effect while the list is empty. TIP: This rule can be combined with the rule \"Forbid creating new rooms\".",
		keywords: ["controling", "limiting", "preventing", "entry"],
		triggerTexts: {
			infoBeep: "You are not allowed to enter this room!",
			attempt_log: "PLAYER_NAME tried to enter a forbidden room",
			log: "PLAYER_NAME entered a forbidden room",
			attempt_announce: "",
			announce: "PLAYER_NAME violated a rule to not enter this room",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			roomList: {
				type: "stringList",
				default: [],
				description: "Only joining rooms with these names is allowed:",
			},
		},
		load(state) {
			// TODO: Fix for NMod
			if (!NMod) {
				hookFunction("ChatSearchJoin", 5, (args, next) => {
					if (state.inEffect && state.customData && state.customData.roomList.length > 0) {
						// Scans results
						let X = 25;
						let Y = 25;
						for (let C = ChatSearchResultOffset; C < ChatSearchResult.length && C < (ChatSearchResultOffset + 24); C++) {
							// If the player clicked on a valid room
							if (MouseIn(X, Y, 630, 85)) {
								if (!state.customData.roomList.some(name => name.toLocaleLowerCase() === ChatSearchResult[C].Name.toLocaleLowerCase())) {
									if (state.isEnforced) {
										state.triggerAttempt();
										return;
									} else {
										state.trigger();
									}
								}
							}

							// Moves the next window position
							X += 660;
							if (X > 1500) {
								X = 25;
								Y += 109;
							}
						}
					}
					next(args);
				}, ModuleCategory.Rules);
				hookFunction("ChatSearchNormalDraw", 5, (args, next) => {
					next(args);
					if (state.isEnforced && state.customData && state.customData.roomList.length > 0) {
						// Scans results
						let X = 25;
						let Y = 25;
						for (let C = ChatSearchResultOffset; C < ChatSearchResult.length && C < (ChatSearchResultOffset + 24); C++) {
							if (!state.customData.roomList.some(name => name.toLocaleLowerCase() === ChatSearchResult[C].Name.toLocaleLowerCase())) {
								DrawButton(X, Y, 630, 85, "", "#88c", undefined, "Blocked by BCX", true);
								// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
								DrawTextFit((ChatSearchResult[C].Friends != null && ChatSearchResult[C].Friends.length > 0 ? "(" + ChatSearchResult[C].Friends.length + ") " : "") + ChatSearchMuffle(ChatSearchResult[C].Name) + " - " + ChatSearchMuffle(ChatSearchResult[C].Creator) + " " + ChatSearchResult[C].MemberCount + "/" + ChatSearchResult[C].MemberLimit + "", X + 315, Y + 25, 620, "black");
								DrawTextFit(ChatSearchMuffle(ChatSearchResult[C].Description), X + 315, Y + 62, 620, "black");
							}

							// Moves the next window position
							X += 660;
							if (X > 1500) {
								X = 25;
								Y += 109;
							}
						}
					}
				}, ModuleCategory.Rules);
			}
		},
	});

	registerRule("block_leaving_room", {
		name: "Prevent leaving the room",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "while defined roles are inside",
		longDescription: "This rule prevents PLAYER_NAME from leaving the room they are currently inside while at least one character with the set minimum role or a higher one is present inside. NOTE: Careful when setting the minimum role too low. If it is set to public for instance, it would mean that PLAYER_NAME can only leave the room when they are alone in it.",
		keywords: ["controling", "limiting", "stopping", "exiting"],
		triggerTexts: {
			infoBeep: "Someone's presence does not allowed you to leave!",
			attempt_announce: "PLAYER_NAME violated a rule by trying to leave this room",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumRole: {
				type: "roleSelector",
				default: AccessLevel.mistress,
				description: "Minimum role preventing room leaving:",
				Y: 320,
			},
		},
		load(state) {
			const active = (): boolean => state.isEnforced &&
				!!state.customData &&
				getAllCharactersInRoom()
					.some(c => !c.isPlayer() && getCharacterAccessLevel(c) <= state.customData!.minimumRole);

			hookFunction("ChatRoomCanLeave", 6, (args, next) => {
				if (active())
					return false;
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomMenuClick", 6, (args, next) => {
				const Space = 870 / (ChatRoomMenuButtons.length - 1);
				for (let B = 0; B < ChatRoomMenuButtons.length; B++) {
					if (MouseXIn(1005 + Space * B, 120) && ChatRoomMenuButtons[B] === "Exit" && active()) {
						state.triggerAttempt();
					}
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_freeing_self", {
		name: "Forbid freeing self",
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME removing any items from PLAYER_NAME's body",
		longDescription: "This rule forbids PLAYER_NAME to remove any items from her own body. Other people can still remove them. The rule has a toggle to optionally still allow to remove items which were given a low difficulty score by the original asset maker, such as hand-held items, plushies, etc. This means that custom crafted properties given to an item such as 'decoy' are not factored in.",
		keywords: ["limiting", "untying", "unbinding", "bondage"],
		triggerTexts: {
			infoBeep: "You are not allowed to remove an item from your body!",
			attempt_log: "PLAYER_NAME tried to remove a worn item, which was forbidden",
			log: "PLAYER_NAME removed a worn item, which was forbidden",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			allowEasyItemsToggle: {
				type: "toggle",
				default: false,
				description: "Still allow removing low difficulty items",
			},
		},
		load(state) {
			let score: number = 999;
			OverridePlayerDialog("BCX_RemoveDisabled", "Usage blocked by BCX");
			OverridePlayerDialog("BCX_StruggleDisabled", "Usage blocked by BCX");
			OverridePlayerDialog("BCX_DismountDisabled", "Usage blocked by BCX");
			OverridePlayerDialog("BCX_EscapeDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Remove.png", "Icons/Remove.png");
			RedirectGetImage("Icons/BCX_Struggle.png", "Icons/Struggle.png");
			RedirectGetImage("Icons/BCX_Dismount.png", "Icons/Dismount.png");
			RedirectGetImage("Icons/BCX_Escape.png", "Icons/Escape.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				const C = args[0];
				if (C.ID === 0 && C.FocusGroup && state.isEnforced) {
					const Item = InventoryGet(C, C.FocusGroup.Name);
					if (Item && state.customData?.allowEasyItemsToggle) {
						score = (Item.Asset.Difficulty ?? 0) + (typeof Item.Property?.Difficulty === "number" ? Item.Property.Difficulty : 0);
						if (score <= 1) {
							return;
						}
					}
					const index_remove = GetDialogMenuButtonArray().indexOf("Remove");
					const index_struggle = GetDialogMenuButtonArray().indexOf("Struggle");
					const index_dismount = GetDialogMenuButtonArray().indexOf("Dismount");
					const index_escape = GetDialogMenuButtonArray().indexOf("Escape");
					if (index_remove >= 0) {
						GetDialogMenuButtonArray()[index_remove] = "BCX_RemoveDisabled";
					}
					if (index_struggle >= 0) {
						GetDialogMenuButtonArray()[index_struggle] = "BCX_StruggleDisabled";
					}
					if (index_dismount >= 0) {
						GetDialogMenuButtonArray()[index_dismount] = "BCX_DismountDisabled";
					}
					if (index_escape >= 0) {
						GetDialogMenuButtonArray()[index_escape] = "BCX_EscapeDisabled";
					}
				}
			}, ModuleCategory.Rules);
			const trigger = (C: Character): boolean => {
				if (C.ID === 0 && state.inEffect && score > 1) {
					state.trigger();
				}
				return false;
			};
			const attempt = (C: Character): boolean => {
				if (C.ID === 0 && state.inEffect && score > 1) {
					state.triggerAttempt();
				}
				return false;
			};
			hookDialogMenuButtonClick("Remove", trigger);
			hookDialogMenuButtonClick("BCX_RemoveDisabled", attempt);
			hookDialogMenuButtonClick("Struggle", trigger);
			hookDialogMenuButtonClick("BCX_StruggleDisabled", attempt);
			hookDialogMenuButtonClick("Dismount", trigger);
			hookDialogMenuButtonClick("BCX_DismountDisabled", attempt);
			hookDialogMenuButtonClick("Escape", trigger);
			hookDialogMenuButtonClick("BCX_EscapeDisabled", attempt);
		},
	});

	registerRule("block_tying_others", {
		name: "Forbid tying up others",
		type: RuleType.Block,
		shortDescription: "either everybody or only more dominant characters",
		longDescription: "This rule forbids PLAYER_NAME to use any items on other characters. Can be set to only affect using items on characters with a higher dominant / lower submissive score than PLAYER_NAME has.",
		keywords: ["limiting", "prevent", "restraints", "bondage"],
		triggerTexts: {
			infoBeep: "You are not allowed to use an item on TARGET_PLAYER!",
			attempt_log: "PLAYER_NAME tried to use an item on TARGET_PLAYER, which was forbidden",
			log: "PLAYER_NAME used an item on TARGET_PLAYER, which was forbidden",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			onlyMoreDominantsToggle: {
				type: "toggle",
				default: true,
				description: "Only forbid tying people with higher dominance",
			},
		},
		load(state) {
			hookFunction("DialogItemClick", 5, (args, next) => {
				if (state.inEffect && state.customData) {
					const toggleOn = state.customData.onlyMoreDominantsToggle;
					const C = (Player.FocusGroup != null) ? Player : CurrentCharacter;
					if (C && C.ID !== 0 && (toggleOn ? ReputationCharacterGet(Player, "Dominant") < ReputationCharacterGet(C, "Dominant") : true)) {
						if (state.isEnforced) {
							state.triggerAttempt(C.MemberNumber);
							return;
						} else {
							state.trigger(C.MemberNumber);
						}
					}
				}
				next(args);
			}, ModuleCategory.Rules);
			hookFunction("AppearanceGetPreviewImageColor", 5, (args, next) => {
				const toggleOn = state.customData?.onlyMoreDominantsToggle;
				const C = args[0];
				if (C && C.ID !== 0 && state.isEnforced && (toggleOn ? ReputationCharacterGet(Player, "Dominant") < ReputationCharacterGet(C, "Dominant") : true)) {
					return "grey";
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_blacklisting", {
		name: "Prevent blacklisting",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "and ghosting of the defined roles",
		longDescription: "This rule prevents PLAYER_NAME from adding characters with the set minimum role or a higher one to their bondage club blacklist and ghostlist.",
		keywords: ["limiting"],
		triggerTexts: {
			infoBeep: "You are not allowed to blacklist/ghost this person!",
			attempt_announce: "PLAYER_NAME violated a rule by trying to blacklist TARGET_PLAYER",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumRole: {
				type: "roleSelector",
				default: AccessLevel.mistress,
				description: "Minimum role forbidden to blacklist:",
				Y: 320,
			},
		},
		load(state) {
			// TODO: Fix for NMod
			if (!NMod) {
				hookFunction("ChatRoomListUpdate", 6, (args, next) => {
					const CN = parseInt(args[2], 10);
					if (state.isEnforced &&
						state.customData &&
						(args[0] === Player.BlackList || args[0] === Player.GhostList) &&
						args[1] &&
						typeof CN === "number" &&
						getCharacterAccessLevel(CN) <= state.customData.minimumRole
					) {
						state.triggerAttempt(CN);
						return;
					}
					return next(args);
				}, ModuleCategory.Rules);
			}
		},
	});

	registerRule("block_whitelisting", {
		name: "Prevent whitelisting",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "of roles 'friend' or 'public'",
		longDescription: "This rule prevents PLAYER_NAME from adding characters with a role lower than a BCX Mistress to their bondage club whitelist.",
		keywords: ["limiting"],
		triggerTexts: {
			infoBeep: "You are not allowed to whitelist this person!",
			attempt_announce: "PLAYER_NAME violated a rule by trying to whitelist TARGET_PLAYER",
		},
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			// TODO: Fix for NMod
			if (!NMod) {
				hookFunction("ChatRoomListUpdate", 6, (args, next) => {
					const CN = parseInt(args[2], 10);
					if (state.isEnforced &&
						args[0] === Player.WhiteList &&
						args[1] &&
						typeof CN === "number" &&
						getCharacterAccessLevel(CN) > AccessLevel.mistress
					) {
						state.triggerAttempt(CN);
						return;
					}
					return next(args);
				}, ModuleCategory.Rules);
			}
		},
	});

	registerRule("block_antiblind", {
		name: "Forbid the antiblind command",
		type: RuleType.Block,
		shortDescription: "BCX's .antiblind command",
		longDescription: "This rule forbids PLAYER_NAME to use the antiblind command. Antiblind is a BCX feature that enables a BCX user to see the whole chat room and all other characters at all times, even when wearing a blinding item. If PLAYER_NAME should be forbidden to use the command, this rule should be used.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "You are not allowed to use the antiblind command!",
			attempt_log: "PLAYER_NAME tried to use the antiblind command",
			log: "PLAYER_NAME used the antiblind command",
		},
		defaultLimit: ConditionsLimit.normal,
		// Implemented externally
	});

	registerRule("block_difficulty_change", {
		name: "Forbid changing difficulty",
		type: RuleType.Block,
		shortDescription: "multiplayer difficulty preference",
		longDescription: "This rule forbids PLAYER_NAME to change her Bondage Club multiplayer difficulty, regardless of the current value.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "You are not allowed to change your difficulty!",
			attempt_log: "PLAYER_NAME tried to change her multiplayer difficulty",
			log: "PLAYER_NAME changed her multiplayer difficulty",
		},
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			hookFunction("PreferenceSubscreenDifficultyRun", 5, (args, next) => {
				next(args);
				const LastChange = typeof Player?.Difficulty?.LastChange !== "number" ? (Player.Creation ?? 0) : Player.Difficulty.LastChange;
				if (
					state.isEnforced &&
					PreferenceDifficultyLevel != null &&
					PreferenceDifficultyLevel !== Player.GetDifficulty() &&
					(PreferenceDifficultyLevel <= 1 || LastChange + 604800000 < CurrentTime) &&
					PreferenceDifficultyAccept
				) {
					DrawButton(500, 825, 300, 64, TextGet("DifficultyChangeMode") + " " + TextGet(`DifficultyLevel${PreferenceDifficultyLevel}`), "#88c", undefined, "Blocked by BCX", true);
				}
			});
			hookFunction("PreferenceSubscreenDifficultyClick", 5, (args, next) => {
				const LastChange = typeof Player?.Difficulty?.LastChange !== "number" ? (Player.Creation ?? 0) : Player.Difficulty.LastChange;
				if (
					state.inEffect &&
					PreferenceDifficultyLevel != null &&
					PreferenceDifficultyLevel !== Player.GetDifficulty() &&
					(PreferenceDifficultyLevel <= 1 || LastChange + 604800000 < CurrentTime) &&
					PreferenceDifficultyAccept &&
					MouseIn(500, 825, 300, 64)
				) {
					if (state.isEnforced) {
						state.triggerAttempt();
						return;
					}
					state.trigger();
				}
				next(args);
			});
		},
	});

	registerRule("block_activities", {
		name: "Prevent usage of all activities",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "any action buttons such as kissing or groping",
		longDescription: "This rule forbids PLAYER_NAME to use any (sexual) activities in chat rooms. Other players can still use activities on her, as this rules does not block the arousal & sexual activities system itself, as forcing the according BC setting would.",
		keywords: ["limiting", "forbid", "controling"],
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			OverridePlayerDialog("BCX_ActivityDisabled", "Usage blocked by BCX");
			RedirectGetImage("Icons/BCX_Activity.png", "Icons/Activity.png");
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				next(args);
				if (state.isEnforced) {
					const index = GetDialogMenuButtonArray().indexOf("Activity");
					if (index >= 0) {
						GetDialogMenuButtonArray()[index] = "BCX_ActivityDisabled";
					}
				}
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_mainhall_maidrescue", {
		name: "Запретить услуги горничной в главном зале",
		loggable: false,
		type: RuleType.Block,
		shortDescription: "to get out of any restraints",
		longDescription: "Это правило запрещает PLAYER_NAME воспользоваться помощью горничной, чтобы освободиться от ограничений в главном зале клуба. Рекомендуется комбинировать с правилом: «Принудительно «Невозможно войти в комнаты для одиночной игры, будучи ограниченным» (существующая настройка BC)», чтобы не дать NPC в других комнатах помочь.",
		keywords: ["limiting", "preventing", "controling"],
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			hookFunction("LogValue", 5, (args, next) => {
				if (state.isEnforced && args[0] === "MaidsDisabled" && args[1] === "Maid")
					return CurrentTime + 500_000_000; // 6 days left range for nicest message
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("MainHallMaidsDisabledBegForMore", 5, (args, next) => {
				if (state.isEnforced)
					return false;
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_action", {
		name: "Forbid the action command",
		type: RuleType.Block,
		shortDescription: "BCX's .action/.a chat command",
		longDescription: "This rule forbids PLAYER_NAME to use the action command. Action is a BCX feature that enables to format a message to look like a BC chat action. If PLAYER_NAME should be forbidden to use the command to communicate, this rule should be used.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "You are not allowed to use the action command!",
			attempt_log: "PLAYER_NAME tried to use the action command",
			log: "PLAYER_NAME used the action command",
		},
		defaultLimit: ConditionsLimit.blocked,
		// Implemented externally
	});

	registerRule("block_BCX_permissions", {
		name: "Prevent using BCX permissions",
		loggable: false,
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME using her permissions for her own BCX, with some exceptions",
		longDescription: "This rule forbids PLAYER_NAME access to some parts of their own BCX they have permission to use, making it as if they do not have 'self access' (see BCX tutorial on permission system) while the rule is active. This rule still leaves access for all permissions where the lowest permitted role ('lowest access') is also set to PLAYER_NAME (to prevent getting stuck). This rule does not affect PLAYER_NAME's permissions to use another users's BCX.",
		keywords: ["limiting", "preventing", "controlling", "accessing", "self", "rights"],
		defaultLimit: ConditionsLimit.blocked,
		// Implemented externally
	});

	registerRule("block_room_admin_UI", {
		name: "Forbid looking at room admin UI",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "while blindfolded",
		longDescription: "This rule forbids PLAYER_NAME from opening the room admin screen while blindfolded, as this discloses the room background and the member numbers of admins, potentially in the room right now. If PLAYER_NAME is a room admin, she can still use chat commands for altering the room or kicking/banning.",
		keywords: ["limiting", "preventing", "controling", "seeing"],
		triggerTexts: {
			infoBeep: "A BCX rule prevents you from using this while unable to see!",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			const active = (): boolean => state.isEnforced && Player.IsBlind();

			hookFunction("ChatRoomMenuDraw", 6, (args, next) => {
				next(args);
				const Space = 870 / (ChatRoomMenuButtons.length - 1);
				for (let B = 0; B < ChatRoomMenuButtons.length; B++) {
					const Button = ChatRoomMenuButtons[B];
					if (Button === "Admin" && active()) {
						DrawButton(1005 + Space * B, 2, 120, 60, "", "Pink", "Icons/Rectangle/" + Button + ".png", TextGet("Menu" + Button));
					}
				}
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomMenuClick", 6, (args, next) => {
				const Space = 870 / (ChatRoomMenuButtons.length - 1);
				for (let B = 0; B < ChatRoomMenuButtons.length; B++) {
					if (MouseXIn(1005 + Space * B, 120) && ChatRoomMenuButtons[B] === "Admin" && active()) {
						state.triggerAttempt();
						return false;
					}
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_using_ggts", {
		name: "Forbid using GGTS",
		type: RuleType.Block,
		shortDescription: "training by GGTS is forbidden",
		longDescription: "This rule forbids PLAYER_NAME to revieve training by the base club's GGTS feature. If the rule is enforced while PLAYER_NAME has remaining GGTS training time, it is removed the moment PLAYER_NAME enters the GGTS room.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "You are not allowed to recieve training by GGTS!",
			attempt_log: "PLAYER_NAME tried to recieve training by GGTS",
			log: "PLAYER_NAME started training by GGTS",
		},
		defaultLimit: ConditionsLimit.limited,
		load(state) {
			hookFunction("AsylumGGTSLoad", 0, (args, next) => {
				if (state.isEnforced) {
					const time = LogValue("ForceGGTS", "Asylum");
					if (time && time > 0) {
						LogDelete("ForceGGTS", "Asylum", true);
					}
					return false;
				}
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("AsylumGGTSClick", 0, (args, next) => {
				if (state.inEffect && MouseIn(1000, 0, 500, 1000)) {
					if (state.isEnforced) {
						state.triggerAttempt();
						return;
					}
					state.trigger();
				}
				next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_club_slave_work", {
		name: "Prevent working as club slave",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "the task from the mistress room",
		longDescription: "This rule prevents PLAYER_NAME to work as a club slave by picking up a club slave collar from the club management room.",
		keywords: ["limiting", "preventing", "controling", "task", "money"],
		defaultLimit: ConditionsLimit.limited,
		load(state) {
			hookFunction("ManagementCanBeClubSlave", 0, (args, next) => {
				if (state.isEnforced) {
					return false;
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_using_unowned_items", {
		name: "Prevent using items of others",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "items not bought",
		longDescription: "This rule prevents PLAYER_NAME to use items she does not own herself, but can use on someone because this person owns them.",
		keywords: ["limiting", "forbid", "controling", "restraints", "gear", "characters"],
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			hookFunction("DialogInventoryBuild", 1, (args, next) => {
				const C = args[0];
				const inventoryBackup = C.Inventory;
				try {
					if (state.isEnforced && !C.IsPlayer()) {
						C.Inventory = [];
					}
					next(args);
				} finally {
					C.Inventory = inventoryBackup;
				}
			}, ModuleCategory.Rules);
		},
	});

	registerRule("block_changing_emoticon", {
		name: "Prevent changing own emoticon",
		type: RuleType.Block,
		shortDescription: "for just PLAYER_NAME",
		longDescription: "This rule prevents PLAYER_NAME from showing, removing or changing an emoticon (afk, zZZ, etc.) over her head. It also blocks her from using the emoticon command on herself.",
		triggerTexts: {
			infoBeep: "You are not allowed to change the emoticon!",
			attempt_log: "PLAYER_NAME tried to use the emoticon command",
			log: "PLAYER_NAME used the emoticon command",
		},
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			// Partially implemented externally
			hookFunction("DialogClickExpressionMenu", 5, (args, next) => {
				const I = DialogFacialExpressions.findIndex(a => a.Appearance.Asset.Group.Name === "Emoticon");
				if (state.inEffect && MouseIn(20, 185 + 100 * I, 90, 90)) {
					if (state.isEnforced) {
						state.triggerAttempt();
						return;
					}
					state.trigger();
				}
				return next(args);
			});
		},
	});

	let changed = false;
	registerRule("block_ui_icons_names", {
		name: "Force-hide UI elements",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "e.g., icons, bars, or names",
		longDescription: "This rule enforces hiding of certain UI elements for PLAYER_NAME over all characters inside the room. Different levels of the effect can be set which follow exactly the behavior of the 'eye'-toggle in the button row above the chat. There is also an option to hide emoticon bubbles over all characters' heads.",
		keywords: ["seeing", "room", "viewing", "looking", "eye", "emoticons"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			hidingStrength: {
				type: "listSelect",
				default: "icons",
				options: [["icons", "Icons"], ["arousal", "Icons/Bar"], ["names", "Icons/Bar/Names"]],
				description: "Select what shall be hidden:",
			},
			alsoHideEmoticons: {
				type: "toggle",
				default: false,
				description: "Also hide emoticons during the effect",
				Y: 440,
			},
		},
		load(state) {
			hookFunction("ChatRoomDrawCharacter", 1, (args, next) => {
				const ChatRoomHideIconStateBackup = ChatRoomHideIconState;

				if (state.isEnforced && state.customData) {
					if (state.customData.hidingStrength === "icons") {
						ChatRoomHideIconState = 1;
					} else if (state.customData.hidingStrength === "arousal") {
						ChatRoomHideIconState = 2;
					} else if (state.customData.hidingStrength === "names") {
						ChatRoomHideIconState = 3;
					} else {
						console.error(`Rule block_ui_icons_names state.customData.hidingStrength has illegal value: ${state.customData.hidingStrength}`);
					}

				}
				next(args);

				ChatRoomHideIconState = ChatRoomHideIconStateBackup;
			});
			hookFunction("CharacterLoadCanvas", 2, (args, next) => {
				const Emoticon = InventoryGet(args[0], "Emoticon");
				if (!Emoticon || !Emoticon.Property || Emoticon.Property.Expression === undefined)
					return next(args);
				const EmoticonStateBackup = Emoticon.Property.Expression;

				if (state.isEnforced && state.customData && state.customData.alsoHideEmoticons) {
					Emoticon.Property.Expression = null;
				}
				next(args);

				Emoticon.Property.Expression = EmoticonStateBackup;
			});
		},
		tick(state) {
			if (state.customData && state.customData.alsoHideEmoticons !== changed) {
				changed = state.customData.alsoHideEmoticons;
				for (const c of ChatRoomCharacter) {
					CharacterLoadCanvas(c);
				}
			}
			return false;
		},
		stateChange(state, newState) {
			for (const c of ChatRoomCharacter) {
				CharacterLoadCanvas(c);
			}
		},
	});
}
