import { ConditionsLimit, ModuleCategory } from "../constants";
import { registerRule, RuleType } from "../modules/rules";
import { AccessLevel, getCharacterAccessLevel } from "../modules/authority";
import { patchFunction, hookFunction, trackFunction } from "../patching";
import { ChatRoomActionMessage, getCharacterName, InfoBeep } from "../utilsClub";
import { ChatroomCharacter, getChatroomCharacter } from "../characters";
import { getAllCharactersInRoom, registerEffectBuilder } from "../characters";
import { isObject } from "../utils";
import { BCX_setTimeout } from "../BCXContext";
import { queryHandlers, sendQuery } from "../modules/messaging";
import { isValidNickname } from "../modules/relationships";

export function initRules_bc_alter() {
	registerRule("alt_restrict_hearing", {
		name: "Sensory deprivation: Sound",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "impacts PLAYER_NAME's hearing; adjustable",
		longDescription: "This rule impacts PLAYER_NAME's natural ability to hear in the same way items do, independent of them (strength of deafening can be adjusted).",
		keywords: ["deafness", "limit", "permanent", "ears"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			deafeningStrength: {
				type: "listSelect",
				options: [["light", "Light"], ["medium", "Medium"], ["heavy", "Heavy"]],
				default: "light",
				description: "Hearing impairment:",
			},
		},
		load(state) {
			const strengthMap: Record<string, number> = {
				light: 1,
				medium: 2,
				heavy: 4,
			};
			hookFunction("Player.GetDeafLevel", 1, (args, next) => {
				let res = next(args);
				if (state.isEnforced && state.customData) {
					res += strengthMap[state.customData.deafeningStrength] ?? 0;
				}
				return res;
			}, ModuleCategory.Rules);
		},
	});

	registerRule("alt_hearing_whitelist", {
		name: "Белый список слушания",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "членов, которых PLAYER_NAME всегда могу понять",
		longDescription: "Это правило определяет список участников, чей голос всегда может быть понят. PLAYER_NAME - независимо от каких-либо предметов сенсорной депривации или правил BCX, нарушающих слух. PLAYER_NAME. Существует дополнительная опция для переключения PLAYER_NAME может по-прежнему понимать голос участника из белого списка, если у этого участника самой нарушена речь (например, из-за того, что ему заткнули рот).",
		keywords: ["deafness", "bypass", "ignore", "antigarble", "ears", "exception", "understanding"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			whitelistedMembers: {
				type: "memberNumberList",
				default: [],
				description: "Номера участников, которые все еще слышат с нарушениями слуха:",
				Y: 350,
				options: {
					pageSize: 3,
				},
			},
			ignoreGaggedMembersToggle: {
				type: "toggle",
				default: false,
				description: "Также поймите, есть ли у них нарушения речи.",
				Y: 710,
			},
		},
		load(state) {
			let ignoreDeaf = false;
			hookFunction("SpeechGarble", 2, (args, next) => {
				const C = args[0];
				if (state.isEnforced &&
					state.customData &&
					C.MemberNumber != null &&
					state.customData.whitelistedMembers
						.filter(m => m !== Player.MemberNumber)
						.includes(C.MemberNumber) &&
					(C.CanTalk() || state.customData.ignoreGaggedMembersToggle)
				) {
					return args[1];
				}
				return next(args);
			}, ModuleCategory.Rules);
			// depends on the function PreferenceIsPlayerInSensDep()
			hookFunction("ChatRoomMessage", 9, (args, next) => {
				const data = args[0];
				const C = args[0].Sender;
				if (state.isEnforced &&
					state.customData &&
					typeof C === "number" &&
					state.customData.whitelistedMembers
						.filter(m => m !== Player.MemberNumber)
						.includes(C)
				) {
					ignoreDeaf = true;
					// Handle garbled whispers
					const orig = Array.isArray(data.Dictionary) && (data.Dictionary as unknown[]).find((i): i is { Text: string; } => isObject(i) && i.Tag === "BCX_ORIGINAL_MESSAGE" && typeof i.Text === "string");
					if (orig && state.customData.ignoreGaggedMembersToggle) {
						data.Content = orig.Text;
					}
				}
				next(args);
				ignoreDeaf = false;
			}, ModuleCategory.Rules);
			trackFunction("PreferenceIsPlayerInSensDep");
			hookFunction("Player.GetDeafLevel", 9, (args, next) => {
				if (ignoreDeaf) {
					return 0;
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("alt_restrict_sight", {
		name: "Сенсорная депривация: зрение",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "воздействия PLAYER_NAME's взгляд; регулируемый",
		longDescription: "Это правило влияет PLAYER_NAME's естественная способность видеть так же, как предметы, независимо от них (силу слепоты можно регулировать).",
		keywords: ["seeing", "blindfold", "limit", "permanent", "eyes"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			blindnessStrength: {
				type: "listSelect",
				options: [["light", "Light"], ["medium", "Medium"], ["heavy", "Heavy"]],
				default: "light",
				description: "Нарушение зрения:",
			},
		},
		load(state) {
			const strengthMap: Record<string, number> = {
				light: 1,
				medium: 2,
				heavy: 3,
			};
			hookFunction("Player.GetBlindLevel", 1, (args, next) => {
				let res = next(args);
				if (state.isEnforced && state.customData) {
					res += strengthMap[state.customData.blindnessStrength] ?? 0;
				}
				return Math.min(res, Player.GameplaySettings?.SensDepChatLog === "SensDepLight" ? 2 : 3);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("alt_seeing_whitelist", {
		name: "Просмотр белого списка",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "членов, которых PLAYER_NAME всегда можно увидеть",
		longDescription: "Это правило определяет список участников, чей внешний вид всегда может нормально просматриваться PLAYER_NAME - независимо от каких-либо ослепляющих элементов или наблюдения за нарушением правил BCX на PLAYER_NAME.",
		keywords: ["sight", "blindness", "bypass", "ignore", "antiblind", "blindfold", "eyes", "seeing"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			whitelistedMembers: {
				type: "memberNumberList",
				default: [],
				description: "Участники, которых все еще видели в слепоте:",
			},
		},
		load(state) {
			let noBlind = false;
			hookFunction("DrawCharacter", 0, (args, next) => {
				const C = args[0];
				if (state.isEnforced && state.customData && C.MemberNumber != null && state.customData.whitelistedMembers.includes(C.MemberNumber)) {
					noBlind = true;
				}
				next(args);
				noBlind = false;
			}, ModuleCategory.Rules);
			hookFunction("DialogMenuButtonBuild", 0, (args, next) => {
				const C = args[0];
				if (state.isEnforced && state.customData && C.MemberNumber != null && state.customData.whitelistedMembers.includes(C.MemberNumber)) {
					noBlind = true;
				}
				next(args);
				noBlind = false;
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomClickCharacter", 0, (args, next) => {
				const C = args[0];
				if (state.isEnforced && state.customData && C.MemberNumber != null && state.customData.whitelistedMembers.includes(C.MemberNumber)) {
					noBlind = true;
				}
				next(args);
				noBlind = false;
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomMessage", 0, (args, next) => {
				let C: ChatroomCharacter | null = null;
				if (typeof args[0]?.Sender === "number") {
					C = getChatroomCharacter(args[0].Sender);
				}
				if (C && state.isEnforced && state.customData && C.MemberNumber != null && state.customData.whitelistedMembers.includes(C.MemberNumber)) {
					noBlind = true;
				}
				next(args);
				noBlind = false;
			}, ModuleCategory.Rules);
			hookFunction("Player.GetBlindLevel", 6, (args, next) => {
				if (noBlind)
					return 0;
				return next(args);
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomUpdateDisplay", 0, (args, next) => {
				next(args);
				if (state.isEnforced && state.customData) {
					if (ChatRoomCharacterCount === 1) {
						ChatRoomCharacterDrawlist = [Player];
					}
					ChatRoomSenseDepBypass = true;
					for (const C of ChatRoomCharacter) {
						if (C.MemberNumber != null && !ChatRoomCharacterDrawlist.includes(C) && state.customData.whitelistedMembers.includes(C.MemberNumber)) {
							ChatRoomCharacterDrawlist.push(C);
						}
					}
					ChatRoomCharacterDrawlist.sort((a, b) => {
						return ChatRoomCharacter.indexOf(a) - ChatRoomCharacter.indexOf(b);
					});
					ChatRoomCharacterCount = ChatRoomCharacterDrawlist.length;
				}
			});
		},
	});

	registerRule("alt_eyes_fullblind", {
		name: "Полностью слеп, когда глаза закрыты",
		type: RuleType.Alt,
		loggable: false,
		longDescription: "Это правило обеспечивает полную слепоту при закрытых глазах. (Настройка легкой сенсорной депривации по-прежнему учитывается и не ослепляет полностью)",
		keywords: ["seeing", "blindness", "eyes", "blindfold", "realistic", "room"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			affectPlayer: {
				type: "toggle",
				default: false,
				description: "Игрок видит эффект и на себе.",
			},
			hideNames: {
				type: "toggle",
				default: false,
				description: "Скрыть имена и значки во время эффекта",
				Y: 440,
			},
		},
		tick(state) {
			if (state.isEnforced) {
				DialogFacialExpressionsSelectedBlindnessLevel = 3;
			}
			return false;
		},
		load(state) {
			hookFunction("DialogClickExpressionMenu", 5, (args, next) => {
				if (state.isEnforced && MouseIn(220, 50, 90, 90))
					return;
				return next(args);
			});
			hookFunction("ChatRoomDrawCharacter", 1, (args, next) => {
				if (args[0])
					return next(args);

				const ChatRoomHideIconStateBackup = ChatRoomHideIconState;
				const eyes1 = InventoryGet(Player, "Eyes");
				const eyes2 = InventoryGet(Player, "Eyes2");
				if (
					state.isEnforced &&
					state.customData?.hideNames &&
					eyes1?.Property?.Expression === "Closed" &&
					eyes2?.Property?.Expression === "Closed"
				) {
					ChatRoomHideIconState = 3;
				}

				next(args);

				ChatRoomHideIconState = ChatRoomHideIconStateBackup;
			});
			hookFunction("DrawCharacter", 1, (args, next) => {
				const eyes1 = InventoryGet(Player, "Eyes");
				const eyes2 = InventoryGet(Player, "Eyes2");
				if (
					state.isEnforced &&
					Player.GameplaySettings?.SensDepChatLog !== "SensDepLight" &&
					eyes1?.Property?.Expression === "Closed" &&
					eyes2?.Property?.Expression === "Closed" &&
					CurrentModule === "Online" &&
					CurrentScreen === "ChatRoom" &&
					args[0].IsPlayer() &&
					state.customData?.affectPlayer
				)
					return;
				return next(args);
			});
		},
	});

	registerRule("alt_field_of_vision", {
		name: "Поле зрения для глаз",
		type: RuleType.Alt,
		loggable: false,
		longDescription: "Это правило затемняет нижнюю половину обзора комнаты, когда глаза смотрят вверх, и верхнюю половину, когда глаза смотрят вниз.",
		keywords: ["seeing", "limit", "angle", "room", "blindfold", "partially", "movement", "gaze", "gazing", "teasing", "viewing", "looking"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			affectPlayer: {
				type: "toggle",
				default: false,
				description: "Игрок видит эффект и на себе.",
			},
			hideNames: {
				type: "toggle",
				default: false,
				description: "Скрыть имена и значки во время эффекта",
				Y: 440,
			},
		},
		load(state) {
			let limitTop = 0;
			let limitBottom = 0;
			const GRADIENT_TIP_POINT = 0.9;
			let inRoomDraw = false;
			hookFunction("ChatRoomDrawBackground", 6, (args, next) => {
				next(args);

				const Y = args[1];
				const Zoom = args[2];
				const height = 1000 * Zoom;
				if (limitTop > 0) {
					const Grad = MainCanvas.createLinearGradient(0, Y, 0, Y + limitTop * height);
					Grad.addColorStop(0, "#000");
					Grad.addColorStop(GRADIENT_TIP_POINT, "#000");
					Grad.addColorStop(1, "rgba(0,0,0,0)");
					MainCanvas.fillStyle = Grad;
					MainCanvas.fillRect(0, Y, 1000, limitTop * height);
				}
				if (limitBottom > 0) {
					const bottomY = Y + (1 - limitBottom) * height;
					const Grad = MainCanvas.createLinearGradient(0, bottomY + limitBottom * height, 0, bottomY);
					Grad.addColorStop(0, "#000");
					Grad.addColorStop(GRADIENT_TIP_POINT, "#000");
					Grad.addColorStop(1, "rgba(0,0,0,0)");
					MainCanvas.fillStyle = Grad;
					MainCanvas.fillRect(0, bottomY, 1000, limitBottom * height);
				}
			});
			hookFunction("ChatRoomDrawCharacter", 2, (args, next) => {
				if (args[0])
					return next(args);

				const ChatRoomHideIconStateBackup = ChatRoomHideIconState;
				limitTop = 0;
				limitBottom = 0;

				if (state.isEnforced) {
					const offset = Player.IsKneeling() ? 0.28 : 0;
					const eyes1 = InventoryGet(Player, "Eyes");
					const eyes2 = InventoryGet(Player, "Eyes2");
					if (eyes1 && eyes2) {
						if (eyes1.Property?.Expression === "Shy" || eyes2.Property?.Expression === "Shy") {
							limitTop = 0.58 + offset;
						} else if (eyes1.Property?.Expression === "Lewd" || eyes2.Property?.Expression === "Lewd") {
							limitBottom = 0.76 - offset;
						} else if (eyes1.Property?.Expression === "VeryLewd" || eyes2.Property?.Expression === "VeryLewd") {
							limitBottom = 0.93 - offset;
						}
					}

					if (CharacterAppearsInverted(Player)) {
						[limitTop, limitBottom] = [limitBottom, limitTop];
					}
				}

				if (limitTop || limitBottom) {
					inRoomDraw = true;
					if (state.customData?.hideNames) {
						ChatRoomHideIconState = 3;
					}
				}
				next(args);

				inRoomDraw = false;
				ChatRoomHideIconState = ChatRoomHideIconStateBackup;
			});

			let DrawC: Character | null = null;
			hookFunction("DrawCharacter", 0, (args, next) => {
				DrawC = args[0];
				const res = next(args);
				DrawC = null;
				return res;
			});

			hookFunction("DrawImageEx", 6, (args, next) => {
				const Source = args[0];
				if (inRoomDraw &&
					(
						ChatRoomCharacterDrawlist.some(C => C.Canvas === Source || C.CanvasBlink === Source) ||
						CharacterCanvas.canvas === Source
					) &&
					Source instanceof HTMLCanvasElement &&
					DrawC &&
					(!DrawC.IsPlayer() || state.customData?.affectPlayer)
				) {
					const Canvas = Source;
					const CharacterCanvas = document.createElement("canvas").getContext("2d")!;
					CharacterCanvas.canvas.width = 500;
					CharacterCanvas.canvas.height = CanvasDrawHeight;

					CharacterCanvas.globalCompositeOperation = "copy";
					CharacterCanvas.drawImage(Canvas, 0, 0);

					CharacterCanvas.globalCompositeOperation = "source-atop";

					const HeightRatio = DrawC.HeightRatio;
					const YOffset = CharacterAppearanceYOffset(DrawC, HeightRatio);
					const YCutOff = YOffset >= 0 || CurrentScreen === "ChatRoom";
					const YStart = CanvasUpperOverflow + (YCutOff ? -YOffset / HeightRatio : 0);
					const SourceHeight = 1000 / HeightRatio + (YCutOff ? 0 : -YOffset / HeightRatio);

					const [top, bottom] = CharacterAppearsInverted(DrawC) ? [limitBottom, limitTop] : [limitTop, limitBottom];

					if (top) {
						const Grad = CharacterCanvas.createLinearGradient(0, YStart, 0, YStart + SourceHeight * top);
						Grad.addColorStop(0, "#000");
						Grad.addColorStop(GRADIENT_TIP_POINT, "#000");
						Grad.addColorStop(1, "rgba(0,0,0,0)");
						CharacterCanvas.fillStyle = Grad;
						CharacterCanvas.fillRect(0, YStart, Canvas.width, SourceHeight * top);
					}
					if (bottom) {
						const Y = YStart + (1 - bottom) * SourceHeight;
						const Grad = CharacterCanvas.createLinearGradient(0, YStart + SourceHeight, 0, Y);
						Grad.addColorStop(0, "#000");
						Grad.addColorStop(GRADIENT_TIP_POINT, "#000");
						Grad.addColorStop(1, "rgba(0,0,0,0)");
						CharacterCanvas.fillStyle = Grad;
						CharacterCanvas.fillRect(0, Y, Canvas.width, Canvas.height - Y);
					}

					args[0] = CharacterCanvas.canvas;
				}
				return next(args);
			});
		},
	});

	registerRule("alt_blindfolds_fullblind", {
		name: "Полностью слеп с завязанными глазами",
		type: RuleType.Alt,
		loggable: false,
		longDescription: "Это правило обеспечивает полную слепоту при ношении любого предмета, каким-либо образом ограничивающего зрение. (Эти правила НЕ учитывают настройку легкой сенсорной депривации и всегда заставляют игрока быть полностью слепым. Свойство крафта «тонкий» также не учитывается из-за технических ограничений.)",
		keywords: ["seeing", "blindness", "limit", "eyes", "realistic", "room", "light"],
		defaultLimit: ConditionsLimit.normal,
		load(state) {
			hookFunction("Player.GetBlindLevel", 2, (args, next) => {
				const effectsToCheck: EffectName[] = ["BlindHeavy", "BlindNormal", "BlindLight"];
				if (state.isEnforced && effectsToCheck.some(i => Player.Effect.includes(i) && !Player.Effect.includes("VRAvatars")))
					return 3;
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("alt_always_slow", {
		name: "Всегда покидайте комнаты медленно",
		type: RuleType.Alt,
		loggable: false,
		longDescription: "Это правило заставляет PLAYER_NAME всегда выходить из комнаты медленно, независимо от того, какие вещи на ней надеты. ВНИМАНИЕ: из-за ограничений в самом Bondage Club только пользователи BCX смогут прекратить PLAYER_NAME от выхода из комнаты. Это правило будет игнорировать настройку сложности ролевой игры BC 'Невозможно замедлить' и замедляться. PLAYER_NAME несмотря ни на что!",
		keywords: ["slowness", "limit", "leaving", "permanent", "stopping", "exit", "blocking"],
		defaultLimit: ConditionsLimit.normal,
		init(state) {
			registerEffectBuilder(PlayerEffects => {
				if (state.isEnforced && !PlayerEffects.Effect.includes("Slow")) {
					PlayerEffects.Effect.push("Slow");
				}
			});
			hookFunction("Player.IsSlow", 2, (args, next) => {
				if (state.isEnforced)
					return true;
				return next(args);
			});
		},
	});

	registerRule("alt_set_leave_slowing", {
		name: "Установить замедленное время выхода",
		type: RuleType.Alt,
		loggable: false,
		longDescription: "Это правило может устанавливать время PLAYER_NAME ей нужно покинуть текущую комнату, когда предметы или правила вынуждают ее медленно покинуть ее. Время можно установить от 1 до 600 секунд (10 минут).",
		keywords: ["slowness", "limit", "leaving", "customized", "increase", "higher", "stopping", "exit", "blocking", "room"],
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			leaveTime: {
				type: "number",
				default: 10,
				options: {
					min: 1,
					max: 600,
				},
				description: "Новое время выхода в секундах:",
			},
		},
		init(state) {
			hookFunction("ChatRoomMenuClick", 2, (args, next) => {
				if (!state.isEnforced)
					return next(args);

				const oldSlowTimer = ChatRoomSlowtimer;
				next(args);
				if (state.customData && oldSlowTimer === 0 && ChatRoomSlowtimer > 0) {
					ChatRoomSlowtimer = CurrentTime + state.customData.leaveTime * 1000;
				}
			});
		},
	});

	registerRule("alt_control_orgasms", {
		name: "Контролируйте способность к оргазму",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "регулируемый: только край, только разрушение, без сопротивления",
		longDescription: "Это правило влияет PLAYER_NAME's способность контролировать свои оргазмы независимо от предметов. Есть три варианта управления: никогда не кончать (всегда на грани, полоса никогда не достигает 100%), принудить к прерванному оргазму (запускается экран оргазма, но не позволяет ей фактически кончить) и предотвратить сопротивление оргазму (возможность войти в оргазм) экран, но не в силах устоять перед ним).",
		keywords: ["deny", "denial", "prevent", "edging", "hypno", "cumming"],
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			orgasmHandling: {
				type: "listSelect",
				default: "edge",
				options: [["edge", "Edge"], ["ruined", "Ruin"], ["noResist", "Prevent resisting"]],
				description: "Попытки достижения оргазма будут зафиксированы:",
			},
		},
		load(state) {
			hookFunction("ServerSend", 0, (args: any, next) => {
				if (args[0] === "ChatRoomChat" && isObject(args[1]) && typeof args[1].Content === "string" && args[1].Type === "Activity" && state.isEnforced) {
					if (args[1].Content.startsWith("OrgasmFailPassive")) {
						args[1].Content = "OrgasmFailPassive0";
					} else if (args[1].Content.startsWith("OrgasmFailTimeout")) {
						args[1].Content = "OrgasmFailTimeout2";
					} else if (args[1].Content.startsWith("OrgasmFailResist")) {
						args[1].Content = "OrgasmFailResist2";
					} else if (args[1].Content.startsWith("OrgasmFailSurrender")) {
						args[1].Content = "OrgasmFailSurrender2";
					}
				}
				next(args);
			});
			hookFunction("ActivityOrgasmPrepare", 5, (args, next) => {
				const C = args[0];
				if (state.isEnforced && state.customData && C.IsPlayer()) {
					if (state.customData.orgasmHandling === "edge") {
						if (C.ArousalSettings) {
							C.ArousalSettings.Progress = 95;
						}
						return;
					} else if (state.customData.orgasmHandling === "ruined") {
						const backup = Player.Effect;
						Player.Effect = backup.concat("DenialMode", "RuinOrgasms");
						next(args);
						Player.Effect = backup;
						return;
					} else if (state.customData.orgasmHandling === "noResist") {
						ActivityOrgasmGameResistCount = 496.5;
					}
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("alt_secret_orgasms", {
		name: "Секретный прогресс оргазма",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "не могу увидеть собственный измеритель возбуждения",
		longDescription: "Это правило предотвращает PLAYER_NAME от просмотра собственного измерителя возбуждения, даже когда он активен и работает. Это означает, что для них является сюрпризом, когда происходит оргазм (быстрое событие). Не влияет на возможность других персонажей видеть счетчик, если это позволяют настройки клуба.",
		keywords: ["hide", "hidden", "control", "cumming"],
		defaultLimit: ConditionsLimit.limited,
		load(state) {
			hookFunction("DrawArousalMeter", 5, (args, next) => {
				const C = args[0];
				if (C.ID === 0 && state.isEnforced)
					return;
				return next(args);
			});
			hookFunction("ChatRoomClickCharacter", 5, (args, next) => {
				const C = args[0];
				const CharX = args[1];
				const CharY = args[2];
				const Zoom = args[3];
				if (C.ID === 0 && state.isEnforced && MouseIn(CharX + 60 * Zoom, CharY + 400 * Zoom, 80 * Zoom, 100 * Zoom) && !C.ArousalZoom) return;
				if (C.ID === 0 && state.isEnforced && MouseIn(CharX + 50 * Zoom, CharY + 200 * Zoom, 100 * Zoom, 500 * Zoom) && C.ArousalZoom) return;
				return next(args);
			});
		},
	});

	const gaveAdminTo: Set<number> = new Set();
	registerRule("alt_room_admin_transfer", {
		name: "Трансфер администратора комнаты",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "дать администратору определенные роли",
		longDescription: "Это правило позволяет определить минимальную роль, которая PLAYER_NAME автоматически предоставит права администратора комнаты (если у нее есть права администратора в комнате). Также есть возможность удалить права администратора из PLAYER_NAME после.",
		keywords: ["automatic", "authority", "power", "exchange", "loss", "control"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumRole: {
				type: "roleSelector",
				default: AccessLevel.owner,
				description: "Минимальная роль, которую получает администратор:",
				Y: 320,
			},
			removeAdminToggle: {
				type: "toggle",
				default: false,
				description: "После этого игрок теряет администратора",
				Y: 470,
			},
		},
		load() {
			hookFunction("ChatRoomSyncMemberLeave", 3, (args, next) => {
				next(args);
				const R = args[0];
				if (gaveAdminTo.has(R.SourceMemberNumber)) {
					gaveAdminTo.delete(R.SourceMemberNumber);
				}
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomClearAllElements", 3, (args, next) => {
				gaveAdminTo.clear();
				next(args);
			}, ModuleCategory.Rules);
		},
		tick(state) {
			let changed = false;
			if (state.isEnforced && state.customData && ChatRoomPlayerIsAdmin() && ServerPlayerIsInChatRoom()) {
				let hasAdmin = false;
				for (const character of getAllCharactersInRoom()) {
					if (!character.isPlayer() && getCharacterAccessLevel(character) <= state.customData.minimumRole) {
						if (ChatRoomData?.Admin?.includes(character.MemberNumber)) {
							hasAdmin = true;
						} else if (!gaveAdminTo.has(character.MemberNumber)) {
							ServerSend("ChatRoomAdmin", { MemberNumber: character.MemberNumber, Action: "Promote" });
							changed = true;
							gaveAdminTo.add(character.MemberNumber);
						}
					}
				}
				if (CurrentModule === "Online" && CurrentScreen === "ChatRoom" && !changed && hasAdmin && ChatRoomData && state.customData.removeAdminToggle) {
					const UpdatedRoom = {
						Name: ChatRoomData.Name,
						Description: ChatRoomData.Description,
						Background: ChatRoomData.Background,
						Limit: ChatRoomData.Limit.toString(),
						Admin: ChatRoomData.Admin.filter((i: number) => i !== Player.MemberNumber),
						Ban: ChatRoomData.Ban,
						BlockCategory: ChatRoomData.BlockCategory.slice(),
						Game: ChatRoomGame,
						Private: ChatRoomData.Private,
						Locked: ChatRoomData.Locked,
					};
					// @ts-expect-error because of Limit being forced to a string above to please the server
					ServerSend("ChatRoomAdmin", { MemberNumber: Player.ID, Room: UpdatedRoom, Action: "Update" });
					changed = true;
				}
			}
			return changed;
		},
	});

	registerRule("alt_room_admin_limit", {
		name: "Ограничить связанные полномочия администратора",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "ограничить полномочия администратора комнаты, пока он сдержан",
		longDescription: "Это правило запрещает PLAYER_NAME совершать любые действия администратора комнаты (кроме кика/бана), когда ее удерживают. Примечание. Это правило не влияет на возможность администратора обходить запертые комнаты, если это позволяют ограничения. Совет: это правило можно комбинировать с правилом 'Принудительное возвращение в чаты при повторном входе', чтобы поймать PLAYER_NAME в этом.",
		keywords: ["restraints", "authority", "suppressing", "bindings", "helpless"],
		defaultLimit: ConditionsLimit.limited,
		triggerTexts: {
			attempt_infoBeep: "Вам запрещено изменять настройки комнаты, находясь в привязном состоянии.",
		},
		load(state) {
			hookFunction("ChatAdminLoad", 0, (args, next) => {
				next(args);
				if (state.isEnforced && ChatRoomPlayerIsAdmin() && Player.IsRestrained()) {
					document.getElementById("InputName")?.setAttribute("disabled", "disabled");
					document.getElementById("InputDescription")?.setAttribute("disabled", "disabled");
					document.getElementById("InputSize")?.setAttribute("disabled", "disabled");
					document.getElementById("InputAdminList")?.setAttribute("disabled", "disabled");
				}
			});
			hookFunction("ChatAdminRun", 0, (args, next) => {
				next(args);
				if (state.isEnforced && ChatRoomPlayerIsAdmin() && Player.IsRestrained()) {
					DrawButton(505, 172, 300, 60, TextGet("Language" + ChatAdminLanguage), "#ebebe4", "", "", true);
					DrawButton(125, 770, 250, 65, TextGet("AddOwnerAdminList"), "#ebebe4", "", "", true);
					DrawButton(390, 770, 250, 65, TextGet("AddLoverAdminList"), "#ebebe4", "", "", true);
					DrawBackNextButton(1300, 450, 500, 60, DialogFindPlayer(ChatAdminBackgroundSelect), "#ebebe4", "",
						() => DialogFindPlayer((ChatAdminBackgroundIndex === 0) ? ChatCreateBackgroundList![ChatCreateBackgroundList!.length - 1] : ChatCreateBackgroundList![ChatAdminBackgroundIndex - 1]),
						() => DialogFindPlayer((ChatAdminBackgroundIndex >= ChatCreateBackgroundList!.length - 1) ? ChatCreateBackgroundList![0] : ChatCreateBackgroundList![ChatAdminBackgroundIndex + 1]),
						true
					);
					DrawButton(1840, 450, 60, 60, "", "#ebebe4", "Icons/Small/Preference.png", "", true);
					DrawBackNextButton(1625, 550, 275, 60, TextGet("Game" + ChatAdminGame), "#ebebe4", "", () => "", () => "", true);
					DrawButton(1486, 728, 64, 64, "", "#ebebe4", ChatAdminPrivate ? "Icons/Checked.png" : "", "", true);
					DrawButton(1786, 728, 64, 64, "", "#ebebe4", ChatAdminLocked ? "Icons/Checked.png" : "", "", true);
					DrawRect(100, 850, 1125, 70, "#ffff88");
					DrawEmptyRect(100, 850, 1125, 70, "Black");
					DrawText("Some settings are not available due to a BCX rule.", 650, 885, "Black", "Gray");
				}
			});
			hookFunction("ChatAdminClick", 5, (args, next) => {
				if (state.isEnforced && ChatRoomPlayerIsAdmin() && Player.IsRestrained() && (
					MouseIn(505, 172, 300, 60) ||
					MouseIn(1300, 75, 600, 350) ||
					MouseIn(1840, 450, 60, 60) ||
					MouseIn(1300, 450, 500, 60) ||
					MouseIn(1625, 550, 275, 60) ||
					MouseIn(1486, 728, 64, 64) ||
					MouseIn(1786, 728, 64, 64) ||
					MouseIn(125, 770, 250, 65) ||
					MouseIn(390, 770, 250, 65)
				))
					return;
				return next(args);
			});
			hookFunction("CommonSetScreen", 5, (args, next) => {
				if (state.isEnforced && args[0] === "Online" && args[1] === "ChatBlockItem" && ChatRoomPlayerIsAdmin() && Player.IsRestrained()) {
					ChatBlockItemEditable = false;
				}
				return next(args);
			});
			hookFunction("ChatRoomAdminAction", 5, (args, next) => {
				const ActionType = args[1] as string;
				if (state.isEnforced && Player.IsRestrained() &&
					ActionType !== "Kick" && ActionType !== "Ban"
				) {
					InfoBeep(`BCX: You are not allowed to use this while restrained.`, 7_000);
					DialogLeave();
					return;
				}
				return next(args);
			});
		},
	});

	registerRule("alt_set_profile_description", {
		name: "Онлайн-описание профиля управления",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "непосредственно устанавливает PLAYER_NAME's описание",
		longDescription: "Это правило устанавливает PLAYER_NAME's онлайн-описание (в ее профиле) на любой текст, введенный в конфиг правила, блокируя его изменения. Внимание: это правило редактирует фактический текст профиля. Это значит, что после сохранения измененного текста исходный текст теряется!",
		keywords: ["edit", "change", "force", "biography", "information", "story", "control"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			playersProfileDescription: {
				type: "textArea",
				default: () => (Player.Description || ""),
				description: "Изменить описание профиля этого игрока:",
			},
		},
		tick(state) {
			if (state.isEnforced && state.customData) {
				if (Player.Description !== state.customData.playersProfileDescription) {
					let Description = Player.Description = state.customData.playersProfileDescription;
					const CompressedDescription = "╬" + LZString.compressToUTF16(Description);
					if (CompressedDescription.length < Description.length || Description.startsWith("╬")) {
						Description = CompressedDescription;
					}
					ServerAccountUpdate.QueueData({ Description });
					state.trigger();
					return true;
				}
			}
			return false;
		},
	});

	function getValidNickname(): string {
		return (Player.Nickname && isValidNickname(Player.Nickname)) ? Player.Nickname :
			isValidNickname(Player.Name) ? Player.Name :
				"";
	}

	registerRule("alt_set_nickname", {
		name: "Управляющий никнейм",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "непосредственно устанавливает PLAYER_NAME's прозвище",
		longDescription: "Это правило устанавливает PLAYER_NAME's псевдоним (в большинстве случаев заменяющий ее имя) на любой текст, введенный в конфигурацию правила, блокируя его изменения из меню псевдонима BC. При желании вы можете выбрать, будет ли восстанавливаться предыдущий никнейм БК, пока правило не действует.",
		keywords: ["edit", "change", "force", "petname", "naming", "alias"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			nickname: {
				type: "string",
				default: getValidNickname,
				description: "Установите никнейм этого игрока:",
				options: /^[\p{L}0-9\p{Z}'-]{0,20}$/u,
			},
			restore: {
				type: "toggle",
				description: "Восстановить предыдущий псевдоним в конце правила",
				default: true,
				Y: 470,
			},
		},
		internalDataValidate: (data) => typeof data === "string",
		internalDataDefault: getValidNickname,
		stateChange(state, newState) {
			if (newState) {
				const current = getValidNickname();
				if (current !== undefined) {
					state.internalData = current;
				}
			} else if (state.customData?.restore) {
				let old = state.internalData;
				if (old !== undefined) {
					if (old === Player.Name) {
						old = "";
					}
					if (Player.Nickname !== old) {
						Player.Nickname = old;
						ServerAccountUpdate.QueueData({ Nickname: old }, true);
					}
				}
			}
		},
		tick(state) {
			if (state.isEnforced && state.customData) {
				let nick = state.customData.nickname.trim();
				if (nick === Player.Name) {
					nick = "";
				}
				if (Player.Nickname !== nick) {
					Player.Nickname = nick;
					ServerAccountUpdate.QueueData({ Nickname: nick }, true);
					state.trigger();
					return true;
				}
			}
			return false;
		},
	});

	registerRule("alt_force_suitcase_game", {
		name: "Всегда носите с собой чемодан",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "из многопользовательской игры 'Лига похитителей'",
		longDescription: "Это правило заставляет PLAYER_NAME to постоянно участвовать в задании по доставке чемоданов Лиги похитителей, автоматически давая ей новый чемодан, когда слот для предметов в чемодане пуст.",
		keywords: ["permanent", "money", "tasks"],
		defaultLimit: ConditionsLimit.normal,
		tick(state) {
			const misc = InventoryGet(Player, "ItemMisc");
			if (state.isEnforced && ReputationGet("Kidnap") > 0 && Player.CanTalk() && !misc) {
				KidnapLeagueOnlineBountyStart();
				return true;
			}
			return false;
		},
	});

	registerRule("alt_restrict_leashability", {
		name: "Ограничьте возможность быть на поводке со стороны других",
		type: RuleType.Alt,
		loggable: false,
		longDescription: "Это правило разрешает привязывать только выбранным ролям PLAYER_NAME, отвечая сообщением о неудачном привязывании других, когда они пытаются это сделать.",
		keywords: ["limit", "prevent", "leashing", "room"],
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			minimumRole: {
				type: "roleSelector",
				default: AccessLevel.owner,
				description: "Минимальная роль, которую разрешено вести:",
				Y: 320,
			},
		},
		load(state) {
			hookFunction("ChatRoomCanBeLeashedBy", 4, (args, next) => {
				const sourceMemberNumber = args[0];
				if (sourceMemberNumber !== 0 &&
					sourceMemberNumber !== Player.MemberNumber &&
					state.isEnforced &&
					state.customData &&
					getCharacterAccessLevel(sourceMemberNumber) > state.customData.minimumRole
				) {
					const character = getChatroomCharacter(sourceMemberNumber);
					ChatRoomActionMessage(`SourceCharacter's leash seems to be cursed and slips out of TargetCharacterName's hand.`, null, [
						{ Tag: "SourceCharacter", MemberNumber: Player.MemberNumber, Text: CharacterNickname(Player) },
						{ Tag: "TargetCharacterName", MemberNumber: sourceMemberNumber, Text: character ? CharacterNickname(character.Character) : getCharacterName(sourceMemberNumber, "[unknown]") },
					]);
					return false;
				}
				return next(args);
			});
		},
	});

	registerRule("alt_hide_friends", {
		name: "Скрыть друзей в сети, если вы слепы",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "также предотвращение звуковых сигналов из списка друзей - настраиваемые исключения",
		longDescription: "Это правило скрывает лиц на PLAYER_NAME's список друзей, когда она полностью ослеплена, что также делает невозможным подачу звуковых сигналов. На полученные сигналы по-прежнему можно ответить. Правило позволяет управлять списком участников, которых можно увидеть в обычном режиме.",
		keywords: ["blindfold", "control"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			allowedMembers: {
				type: "memberNumberList",
				default: [],
				description: "Номера участников, которые всегда можно увидеть:",
			},
		},
		load(state) {
			patchFunction("FriendListLoadFriendList", {
				"data.forEach(friend => {": 'data.forEach(friend => { if (typeof friend.MemberNumber !== "number") return;',
			});
			patchFunction("FriendListLoadFriendList", {
				"FriendListContent += `<div class='FriendListLinkColumn' onClick='FriendListBeep(${friend.MemberNumber})'> ${BeepCaption} </div>`;": "if (typeof friend.MemberNumber === 'number') FriendListContent += `<div class='FriendListLinkColumn' onClick='FriendListBeep(${friend.MemberNumber})'> ${BeepCaption} </div>`;",
			});
			hookFunction("FriendListLoadFriendList", 1, (args, next) => {
				const data = args[0] as any[];
				const allowList = state.customData?.allowedMembers;
				if (state.isEnforced && allowList && Player.GetBlindLevel() >= 3) {
					data.forEach((friend: any) => {
						if (!allowList.includes(friend.MemberNumber)) {
							friend.MemberName = "Someone";
							friend.MemberNumber = "######";
						}
					});
				}
				return next(args);
			});
		},
	});

	registerRule("alt_forced_summoning", {
		name: "Готов быть вызванным",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "поводок PLAYER_NAME из любого места с помощью звукового сигнала с сообщением",
		longDescription: "Это правило заставляет PLAYER_NAME переключать комнаты из любой точки клуба в чат призывателя через 15 секунд. Он работает, отправляя звуковое сообщение с заданным текстом или просто словом 'вызвать' PLAYER_NAME. Члены, которым разрешено вызывать PLAYER_NAME можно установить. ПРИМЕЧАНИЯ: PLAYER_NAME всегда можно вызвать, независимо от того, есть ли у нее поводок или ей запрещено выходить из комнаты (игнорируя ограничения или запертые комнаты). Однако, если целевая комната заполнена или заперта, она окажется в вестибюле. Вызов не будет работать, если название комнаты не указано в звуковом сообщении!",
		keywords: ["leashing", "room", "calling", "ordering", "move", "moving", "movement", "warping", "beaming", "transporting"],
		triggerTexts: {
			infoBeep: "Вы вызваны TARGET_PLAYER!",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			allowedMembers: {
				type: "memberNumberList",
				default: [],
				description: "Номера участников, которым разрешено вызывать:",
				Y: 325,
				options: {
					pageSize: 1,
				},
			},
			summoningText: {
				type: "string",
				default: "Come to my room immediately",
				description: "Текст, используемый для вызова:",
				Y: 705,
			},
			summonTime: {
				type: "number",
				default: 15,
				description: "Время в секундах до принудительного вызова:",
				Y: 550,
			},
		},
		load(state) {
			let beep = false;
			hookFunction("ServerAccountBeep", 7, (args: any, next) => {
				const data = args[0];

				if (isObject(data) &&
					// Check it is beep from person
					!data.BeepType &&
					typeof data.MemberNumber === "number" &&
					// Check rule is active
					state.isEnforced &&
					state.customData &&
					state.customData.allowedMembers.includes(data.MemberNumber) &&
					// Check the message matches summon message
					typeof data.Message === "string" &&
					(data.Message.toLocaleLowerCase().startsWith(state.customData.summoningText.trim().toLocaleLowerCase()) || data.Message.trim().toLocaleLowerCase() === "summon") &&
					data.ChatRoomName &&
					// Check we are allowed into target space
					ChatSelectGendersAllowed(data.ChatRoomSpace, Player.GetGenders())
				) {
					ChatRoomActionMessage(`SourceCharacter received a summon: "${state.customData.summoningText}".`, null, [
						{ Tag: "SourceCharacter", MemberNumber: Player.MemberNumber, Text: CharacterNickname(Player) },
					]);
					beep = true;
					BCX_setTimeout(() => {
						// Check if rule is still in effect or if we are already there
						if (!state.isEnforced || (ServerPlayerIsInChatRoom() && ChatRoomData?.Name === data.ChatRoomName)) return;

						// leave
						ChatRoomActionMessage(`The demand for SourceCharacter's presence is now enforced.`, null, [
							{ Tag: "SourceCharacter", MemberNumber: Player.MemberNumber, Text: CharacterNickname(Player) },
						]);
						ChatRoomLeave();
						ChatRoomStart(data.ChatRoomSpace, "", null, null, "Introduction", BackgroundsTagList);
						CharacterDeleteAllOnline();

						// join
						ChatRoomPlayerCanJoin = true;
						ServerSend("ChatRoomJoin", { Name: data.ChatRoomName });
					}, state.customData.summonTime * 1000);
				}
				next(args);
				if (beep) state.triggerAttempt(data.MemberNumber);
				beep = false;
			}, ModuleCategory.Rules);
		},
	});

	registerRule("alt_allow_changing_appearance", {
		name: "Разрешить изменение всего внешнего вида",
		type: RuleType.Alt,
		loggable: false,
		shortDescription: "из PLAYER_NAME - для определенных ролей",
		keywords: ["force", "setting", "wardrobe", "body", "modifications"],
		longDescription: "Это правило позволяет вам определить минимальную роль, которая (и все более высокие роли) имеет разрешение полностью изменять весь внешний вид PLAYER_NAME (тело и предметы косплея), игнорируя настройки онлайн-предпочтений BC 'Разрешить другим полностью изменять ваш внешний вид' и 'Запретить другим изменять предметы косплея'. Таким образом, это правило может определить группу людей, которая разрешена, а всем остальным — нет. ВАЖНО: Только другие пользователи BCX смогут изменить PLAYER_NAME's внешний вид, если это правило им это позволяет, а настройки БК им это запрещают.",
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumRole: {
				type: "roleSelector",
				default: AccessLevel.owner,
				description: "Минимальная разрешенная роль:",
			},
		},
		init(state) {
			queryHandlers.rule_alt_allow_changing_appearance = (sender) => {
				return state.inEffect && !!state.customData && getCharacterAccessLevel(sender) <= state.customData.minimumRole;
			};
			let appearanceCharacterAllowed: null | number = null;
			hookFunction("CharacterAppearanceLoadCharacter", 0, (args, next) => {
				appearanceCharacterAllowed = null;
				const C = args[0];
				const char = C.MemberNumber && getChatroomCharacter(C.MemberNumber);
				if (!C.IsPlayer() && char && char.BCXVersion) {
					sendQuery("rule_alt_allow_changing_appearance", undefined, char.MemberNumber).then(res => {
						if (res) {
							appearanceCharacterAllowed = char.MemberNumber;
						}
					});
				}
				return next(args);
			}, null);
			hookFunction("WardrobeGroupAccessible", 4, (args, next) => {
				const C = args[0];
				if (!C.IsPlayer() && C.MemberNumber && C.MemberNumber === appearanceCharacterAllowed && C.OnlineSharedSettings) {
					const AllowFullWardrobeAccess = C.OnlineSharedSettings.AllowFullWardrobeAccess;
					const BlockBodyCosplay = C.OnlineSharedSettings.BlockBodyCosplay;
					try {
						C.OnlineSharedSettings.AllowFullWardrobeAccess = true;
						C.OnlineSharedSettings.BlockBodyCosplay = false;
						return next(args);
					} finally {
						C.OnlineSharedSettings.AllowFullWardrobeAccess = AllowFullWardrobeAccess;
						C.OnlineSharedSettings.BlockBodyCosplay = BlockBodyCosplay;
					}
				}
				return next(args);
			}, null);
		},
		load(state) {
			const allow = (memberNumber: number): boolean => {
				return state.inEffect && !!state.customData && getCharacterAccessLevel(memberNumber) <= state.customData.minimumRole;
			};
			hookFunction("ValidationCanAddOrRemoveItem", 4, (args, next) => {
				const params = args[1];
				if (allow(params.sourceMemberNumber) && params.C.IsPlayer() && params.C.OnlineSharedSettings) {
					const AllowFullWardrobeAccess = params.C.OnlineSharedSettings.AllowFullWardrobeAccess;
					const BlockBodyCosplay = params.C.OnlineSharedSettings.BlockBodyCosplay;
					try {
						params.C.OnlineSharedSettings.AllowFullWardrobeAccess = true;
						params.C.OnlineSharedSettings.BlockBodyCosplay = false;
						return next(args);
					} finally {
						params.C.OnlineSharedSettings.AllowFullWardrobeAccess = AllowFullWardrobeAccess;
						params.C.OnlineSharedSettings.BlockBodyCosplay = BlockBodyCosplay;
					}
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});
}
