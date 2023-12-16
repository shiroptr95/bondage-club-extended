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
		shortDescription: "PLAYER_NAME используя на PLAYER_NAME",
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
		shortDescription: "PLAYER_NAME используя на PLAYER_NAME",
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
		shortDescription: "PLAYER_NAME выбирая на PLAYER_NAME",
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
		shortDescription: "PLAYER_NAME используя на PLAYER_NAME",
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
		longDescription: "Это правило запрещает PLAYER_NAME доступ к собственному гардеробу. (Другие все еще могут нормально переодеться.)",
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
		name: "Запретить использование гардероба на других",
		type: RuleType.Block,
		longDescription: "This rule forbids PLAYER_NAME to use the wardrobe of other club members.",
		keywords: ["controling", "limiting", "clothings", "preventing", "changing"],
		triggerTexts: {
			infoBeep: "Вам не разрешается менять то, что носят другие!",
			attempt_log: "PLAYER_NAME пытался использовать TARGET_PLAYER's шкаф, который был запрещен",
			log: "PLAYER_NAME использовал TARGET_PLAYER's шкаф, который был запрещен",
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
				description: "Марк изображает из себя разрешенного или запрещенного:",
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
		name: "Запретить создание новых комнат",
		type: RuleType.Block,
		longDescription: "Это правило запрещает PLAYER_NAME создавать новые комнаты.",
		keywords: ["controling", "limiting", "preventing"],
		triggerTexts: {
			infoBeep: "Вам не разрешено создавать новую комнату!",
			attempt_log: "PLAYER_NAME пытался создать чат, который был запрещен",
			log: "PLAYER_NAME создал чат, который был запрещен",
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
		name: "Ограничить вход в помещения",
		type: RuleType.Block,
		shortDescription: "разрешить ввод только определенных",
		longDescription: "Это правило запрещает PLAYER_NAME для входа во все комнаты, которых нет в редактируемом белом списке разрешенных. ПРИМЕЧАНИЕ. В целях безопасности это правило не действует, пока список пуст. СОВЕТ: Это правило можно объединить с правилом \"Запретить создание новых комнат\".",
		keywords: ["controling", "limiting", "preventing", "entry"],
		triggerTexts: {
			infoBeep: "Вам не разрешено входить в эту комнату!",
			attempt_log: "PLAYER_NAME tпытался войти в запретную комнату",
			log: "PLAYER_NAME вошел в запретную комнату",
			attempt_announce: "",
			announce: "PLAYER_NAME нарушил правило не входить в эту комнату",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			roomList: {
				type: "stringList",
				default: [],
				description: "Разрешено объединять только комнаты с этими именами:",
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
		name: "Запретить выходить из комнаты",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "пока определенные роли находятся внутри",
		longDescription: "Это правило предотвращает PLAYER_NAME выйти из комнаты, в которой они сейчас находятся, пока внутри находится хотя бы один персонаж с установленной минимальной или более высокой ролью. ПРИМЕЧАНИЕ. Будьте осторожны, устанавливая слишком низкую минимальную роль. Например, если он установлен как общедоступный, это будет означать, что PLAYER_NAME могут выйти из комнаты только тогда, когда они одни.",
		keywords: ["controling", "limiting", "stopping", "exiting"],
		triggerTexts: {
			infoBeep: "Чье-то присутствие не дает вам уйти!",
			attempt_announce: "PLAYER_NAME нарушил правило, пытаясь покинуть эту комнату",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumRole: {
				type: "roleSelector",
				default: AccessLevel.mistress,
				description: "Минимальная роль, предотвращающая выход из комнаты:",
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
		name: "Запретить освобождать себя",
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME удаление любых предметов из PLAYER_NAME's тело",
		longDescription: "Это правило запрещает PLAYER_NAME удалять любые предметы со своего тела. Другие люди по-прежнему могут их удалить. В правиле есть переключатель, позволяющий при необходимости удалять предметы, которым первоначальный создатель объекта присвоил низкую оценку сложности, например ручные предметы, плюшевые игрушки и т. д. Это означает, что специально созданные свойства, присвоенные предмету, такие как «приманка», ' не учитываются.",
		keywords: ["limiting", "untying", "unbinding", "bondage"],
		triggerTexts: {
			infoBeep: "Вынимать предмет из тела запрещено!",
			attempt_log: "PLAYER_NAME пытался снять изношенную вещь, что было запрещено",
			log: "PLAYER_NAME сняла изношенную вещь, что было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			allowEasyItemsToggle: {
				type: "toggle",
				default: false,
				description: "По-прежнему разрешается удалять предметы низкой сложности.",
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
		name: "Запретить связывать других",
		type: RuleType.Block,
		shortDescription: "либо все, либо только наиболее доминирующие персонажи",
		longDescription: "Это правило запрещает PLAYER_NAME использовать любые предметы на других персонажах. Можно настроить так, чтобы использование предметов влияло только на персонажей с более высоким показателем доминирования / более низким показателем подчинения, чем PLAYER_NAME имеет.",
		keywords: ["limiting", "prevent", "restraints", "bondage"],
		triggerTexts: {
			infoBeep: "Вам не разрешено использовать предмет на TARGET_PLAYER!",
			attempt_log: "PLAYER_NAME пытался использовать предмет на TARGET_PLAYER, что было запрещено",
			log: "PLAYER_NAME использовал предмет на TARGET_PLAYER, что было запрещено",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			onlyMoreDominantsToggle: {
				type: "toggle",
				default: true,
				description: "Только запретите связывать людей с более высоким доминированием",
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
		name: "Предотвращение внесения в черный список",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "и ореолы определенных ролей",
		longDescription: "Это правило предотвращает PLAYER_NAME от добавления персонажей с установленной минимальной ролью или выше в черный список и список призраков клуба бондажа.",
		keywords: ["limiting"],
		triggerTexts: {
			infoBeep: "Вам не разрешено вносить этого человека в черный список/призрак!",
			attempt_announce: "PLAYER_NAME нарушил правило, попытавшись внести в черный список TARGET_PLAYER",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumRole: {
				type: "roleSelector",
				default: AccessLevel.mistress,
				description: "Минимальная роль, запрещенная для внесения в черный список:",
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
		name: "Запретить внесение в белый список",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "ролей 'друг' или 'публичный'",
		longDescription: "Это правило предотвращает PLAYER_NAME от добавления персонажей с ролью ниже, чем Хозяйка BCX, в белый список клуба бондажа.",
		keywords: ["limiting"],
		triggerTexts: {
			infoBeep: "Вам не разрешено внести этого человека в белый список!",
			attempt_announce: "PLAYER_NAME нарушил правило, попытавшись внести в белый список TARGET_PLAYER",
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
		name: "Запретить команду antiblind",
		type: RuleType.Block,
		shortDescription: "BCX's .antiblind команда",
		longDescription: "Это правило запрещает PLAYER_NAME использовать команду antiblind. Антислепой — это функция BCX, которая позволяет пользователю BCX видеть всю комнату чата и всех других персонажей в любое время, даже если он носит ослепляющий предмет. Если PLAYER_NAME следует запретить использование команды, следует использовать это правило.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "Вам не разрешено использовать команду antiblind!",
			attempt_log: "PLAYER_NAME попробовал использовать команду antiblind",
			log: "PLAYER_NAME использовал команду antiblind",
		},
		defaultLimit: ConditionsLimit.normal,
		// Implemented externally
	});

	registerRule("block_difficulty_change", {
		name: "Запретить изменение сложности",
		type: RuleType.Block,
		shortDescription: "предпочтения сложности многопользовательской игры",
		longDescription: "Это правило запрещает PLAYER_NAME чтобы изменить ее многопользовательскую сложность в Bondage Club, независимо от текущего значения.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "Вам не разрешено менять сложность!",
			attempt_log: "PLAYER_NAME пыталась изменить сложность многопользовательской игры",
			log: "PLAYER_NAME изменила сложность ее мультиплеера",
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
		name: "Запретить использование всех действий",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "любые кнопки действий, такие как поцелуи или ласки",
		longDescription: "Это правило запрещает PLAYER_NAME использовать любые (сексуальные) действия в чатах. Другие игроки по-прежнему могут использовать на ней действия, поскольку эти правила не блокируют саму систему возбуждения и сексуальной активности, как это могло бы произойти при принудительном использовании соответствующих настроек BC.",
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
		longDescription: "Это правило запрещает PLAYER_NAME воспользоваться помощью горничной, чтобы освободиться от ограничений в главном зале клуба. Рекомендуется комбинировать с правилом: «Принудительно «Невозможно войти в комнаты для одиночной игры, будучи ограниченным» (настройка BC)», чтобы не дать NPC в других комнатах помочь.",
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
		name: "Запретить команду действия",
		type: RuleType.Block,
		shortDescription: "BCX's .action/.a команда чата",
		longDescription: "Это правило запрещает PLAYER_NAME использовать команду действия. Действие — это функция BCX, которая позволяет форматировать сообщение так, чтобы оно выглядело как действие чата BC. Если PLAYER_NAME нужно запретить использовать команду для общения, следует использовать это правило.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "Вам не разрешено использовать команду действия!",
			attempt_log: "PLAYER_NAME пытался использовать команду действия",
			log: "PLAYER_NAME использовал команду действия",
		},
		defaultLimit: ConditionsLimit.blocked,
		// Implemented externally
	});

	registerRule("block_BCX_permissions", {
		name: "Запретить использование разрешений BCX",
		loggable: false,
		type: RuleType.Block,
		shortDescription: "PLAYER_NAME используя свои разрешения для собственного BCX, за некоторыми исключениями",
		longDescription: "Это правило запрещает PLAYER_NAME доступ к некоторым частям своего собственного BCX, на использование которых у них есть разрешение, как будто у них нет «самостоятельного доступа» (см. руководство BCX по системе разрешений), пока правило активно. Это правило по-прежнему оставляет доступ для всех разрешений, для которых также установлена наименьшая разрешенная роль ('самый низкий доступ'). PLAYER_NAME (чтобы не застрять). Это правило не влияет PLAYER_NAME's разрешения на использование BCX других пользователей.",
		keywords: ["limiting", "preventing", "controlling", "accessing", "self", "rights"],
		defaultLimit: ConditionsLimit.blocked,
		// Implemented externally
	});

	registerRule("block_room_admin_UI", {
		name: "Запретить просмотр UI администратора комнаты",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "с завязанными глазами",
		longDescription: "Это правило запрещает PLAYER_NAME от открытия экрана администратора комнаты с завязанными глазами, поскольку это раскрывает фон комнаты и количество членов администраторов, потенциально находящихся в комнате прямо сейчас. Если PLAYER_NAME является администратором комнаты, она по-прежнему может использовать команды чата для изменения комнаты или удаления/бана.",
		keywords: ["limiting", "preventing", "controling", "seeing"],
		triggerTexts: {
			infoBeep: "Правило BCX не позволяет вам использовать это, пока вы не видите!",
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
		name: "Запретить использование GGTS",
		type: RuleType.Block,
		shortDescription: "обучение по GGTS запрещено",
		longDescription: "Это правило запрещает PLAYER_NAME просмотреть тренировку с помощью функции GGTS базового клуба. Если правило соблюдается в то время как PLAYER_NAME осталось время обучения GGTS, оно удаляется в тот момент, когда PLAYER_NAME входит в комнату GGTS.",
		keywords: ["limiting", "preventing", "controling"],
		triggerTexts: {
			infoBeep: "Вам не разрешено проходить обучение в GGTS!",
			attempt_log: "PLAYER_NAME пытался пройти обучение в GGTS",
			log: "PLAYER_NAME начал обучение в GGTS",
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
		name: "Запретить работать в качестве раба в клубе",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "задание из комнаты хозяйки",
		longDescription: "Это правило предотвращает PLAYER_NAME работать клубным рабом, взяв ошейник клубного раба из комнаты управления клубом.",
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
		name: "Запретить использование чужих вещей",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "предметы не куплены",
		longDescription: "Это правило предотвращает PLAYER_NAME использовать предметы, которыми она не владеет сама, но может использовать на ком-то, потому что они принадлежат этому человеку.",
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
		name: "Запретить изменение собственного смайлика",
		type: RuleType.Block,
		shortDescription: "Просто для PLAYER_NAME",
		longDescription: "Это правило предотвращает PLAYER_NAME от показа, удаления или изменения смайла (AFK, ZZZ и т.п.) над головой. Это также не позволяет ей использовать команду смайлика на себе.",
		triggerTexts: {
			infoBeep: "Вам не разрешено менять смайлик!",
			attempt_log: "PLAYER_NAME пытался использовать команду смайлика",
			log: "PLAYER_NAME использовал команду смайлика",
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
		name: "Принудительно скрыть элементы UI",
		type: RuleType.Block,
		loggable: false,
		shortDescription: "например, значки, полосы или имена",
		longDescription: "Это правило обеспечивает скрытие определенных элементов UI для PLAYER_NAME над всеми персонажами внутри комнаты. Можно установить различные уровни эффекта, которые точно соответствуют поведению переключателя «глаз» в строке кнопок над чатом. Также есть возможность скрыть пузыри смайликов над головами всех персонажей.",
		keywords: ["seeing", "room", "viewing", "looking", "eye", "emoticons"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			hidingStrength: {
				type: "listSelect",
				default: "icons",
				options: [["icons", "Icons"], ["arousal", "Icons/Bar"], ["names", "Icons/Bar/Names"]],
				description: "Выберите, что будет скрыто:",
			},
			alsoHideEmoticons: {
				type: "toggle",
				default: false,
				description: "Также скройте смайлы во время эффекта.",
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
